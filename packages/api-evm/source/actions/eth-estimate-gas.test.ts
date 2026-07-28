import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Enums, Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as EvmServiceProvider } from "@mainsail/evm-service";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { EthEstimateGasAction } from "./index.js";

describe<{
	app: Application;
	action: EthEstimateGasAction;
	validator: Contracts.Crypto.Validator;
	evm: Contracts.Evm.Instance;
	dataPath: string;
}>("EthEstimateGasAction", ({ beforeEach, afterEach, it, assert, stub, spy }) => {
	const sender = "0xBd6F65c58A46427AF4B257cBE231D0eD69eD5508";
	const recipient = "0xEcC2717Ac3558141bFe0f512ACD5c62C5AB303C7";
	const zero = "0x0000000000000000000000000000000000000000";

	const milestone = {
		block: { maxGasLimit: 30_000_000 },
		evmSpec: Enums.Evm.SpecId.PRAGUE,
		gas: { minimumGasPrice: 5 },
	};

	const simulateContext = (overrides: Partial<Contracts.Evm.TransactionSimulateContext>) => ({
		blockContext: {
			commitKey: { blockNumber: 0n, round: 0n },
			gasLimit: BigInt(milestone.block.maxGasLimit),
			timestamp: BigInt(Date.now()),
			validatorAddress: zero,
		},
		data: Buffer.alloc(0),
		from: sender,
		gasLimit: 100_000n,
		gasPrice: BigInt(milestone.gas.minimumGasPrice),
		nonce: 0n,
		specId: milestone.evmSpec,
		value: 0n,
		...overrides,
	});

	beforeEach(async (context) => {
		context.dataPath = mkdtempSync(join(tmpdir(), "estimate-gas-evm-"));

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			alert: () => {},
			debug: () => {},
			info: () => {},
			notice: () => {},
			warn: () => {},
		});
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });
		context.app.useDataPath(context.dataPath);

		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(EvmServiceProvider).register();

		context.evm = context.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "rpc");
		await context.evm.initializeGenesis({
			account: sender,
			deployerAccount: zero,
			initialBlockNumber: 0n,
			initialSupply: 100_000_000_000_000_000_000n,
			usernameContract: zero,
			validatorContract: zero,
		});

		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getHeight: () => 0,
			getMilestone: () => milestone,
		});

		context.action = context.app.resolve(EthEstimateGasAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	afterEach(async ({ evm, dataPath }) => {
		await evm.dispose();
		rmSync(dataPath, { force: true, recursive: true });
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_estimateGas");
	});

	it("schema should validate good and bad params", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_estimateGas", [
				{ data: "0x1234", from: "0x0000000000000000000000000000000000000000" },
			]).errors,
		);

		// contract deployment: "to" is optional
		assert.undefined(validator.validate("jsonRpc_eth_estimateGas", [{ from: sender.toLowerCase() }]).errors);

		// missing required "from"
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", [{ data: "0x1234" }]).errors);
		// too many items
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", [{ from: sender }, {}]).errors);
		// not an array
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", {}).errors);
	});

	it("should return the default 21000 for a vanilla transfer to an EOA", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");
		const simulate = spy(evm, "simulate");

		assert.equal(await action.handle([{ from: sender, to: recipient }]), "0x5208");

		codeAt.calledWith(recipient);
		simulate.neverCalled();
	});

	it("should not short-circuit when recipient is a contract", async ({ action, evm }) => {
		// no contract is deployed in the fresh genesis state, so fake the code lookup;
		// the estimation itself still runs against the real EVM
		stub(evm, "codeAt").resolvedValue("0x60006000");

		const result = await action.handle([{ from: sender, to: recipient }]);
		assert.true(BigInt(result) >= 21_000n);
		assert.not.equal(result, "0x5208");
	});

	it("should estimate a deployment with no data at the real CREATE intrinsic cost", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");
		const simulate = spy(evm, "simulate");

		const estimated = BigInt(await action.handle([{ from: sender }]));

		// deployments must go through simulation, never the vanilla-transfer shortcut
		codeAt.neverCalled();
		assert.undefined(simulate.getCallArgs(0)[0].to);

		// an empty CREATE costs exactly 53000 (21000 base + 32000 CREATE); the
		// estimator may return up to ~1.5% above the true requirement
		assert.true(estimated >= 53_000n);
		assert.true(estimated <= 53_795n);

		// the estimate must actually suffice on the real EVM
		const { receipt } = await evm.simulate(simulateContext({ gasLimit: estimated }));
		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 53_000n);
	});

	it("should not short-circuit a contract deployment with empty data", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");

		const estimated = BigInt(await action.handle([{ data: "0x", from: sender }]));

		codeAt.neverCalled();
		assert.true(estimated >= 53_000n);
		assert.true(estimated <= 53_795n);
	});

	it("should estimate a deployment with init code above the empty CREATE cost", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");

		// single STOP opcode as init code: deploys an empty contract
		const data = "0x00";
		const estimated = BigInt(await action.handle([{ data, from: sender }]));

		// data present -> the vanilla-transfer short-circuit is skipped entirely
		codeAt.neverCalled();

		// 53000 + 4 (one zero calldata byte) + 2 (one init-code word, EIP-3860)
		assert.true(estimated >= 53_006n);
		assert.true(estimated <= 53_801n);

		const { receipt } = await evm.simulate(
			simulateContext({ data: Buffer.from(data.slice(2), "hex"), gasLimit: estimated }),
		);
		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 53_006n);
	});

	it("should estimate enough gas for a transfer that the real EVM accepts end to end", async ({ action, evm }) => {
		const estimated = BigInt(await action.handle([{ from: sender, to: recipient, value: "0xde0b6b3a7640000" }]));

		const { receipt } = await evm.simulate(
			simulateContext({ gasLimit: estimated, to: recipient, value: 1_000_000_000_000_000_000n }),
		);
		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, estimated);
	});

	it("should throw RpcError 'execution reverted' when the transaction reverts on the real EVM", async ({
		action,
	}) => {
		// init code PUSH1 00 PUSH1 00 REVERT: reverts with empty output
		await assert.rejects(
			() => action.handle([{ data: "0x60006000fd", from: sender }]),
			RpcError,
			"execution reverted",
		);
	});

	it("should throw RpcError with message on execution error in first execute", async ({ action, evm }) => {
		stub(evm, "simulate").rejectedValue(new Error("out of gas"));

		await assert.rejects(
			() => action.handle([{ data: "0x1234", from: sender, to: recipient }]),
			RpcError,
			"execution reverted: out of gas",
		);
	});

	it("should pass user-provided gas as the initial max limit", async ({ action, evm }) => {
		const simulate = spy(evm, "simulate");

		// 0x30D40 = 200_000
		await action.handle([{ from: sender, gas: "0x30D40" }]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 200_000n);
	});

	it("should default max limit to block.maxGasLimit when gas is absent", async ({ action, evm }) => {
		const simulate = spy(evm, "simulate");

		await action.handle([{ from: sender }]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 30_000_000n);
	});

	it("should use account nonce and default gas price from milestone", async ({ action, evm }) => {
		// the scripted nonce proves the value is read from getAccountInfo; simulate is
		// stubbed alongside since the real EVM would reject the mismatching nonce
		stub(evm, "getAccountInfo").resolvedValue({ balance: 0n, nonce: 11n });
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		await action.handle([{ data: "0x1234", from: sender, to: recipient }]);

		assert.equal(simulate.getCallArgs(0)[0].nonce, 11n);
		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 5n);
	});

	it("should use user-provided gas price when present", async ({ action, evm }) => {
		const simulate = spy(evm, "simulate");

		// 0x64 = 100
		await action.handle([{ from: sender, gasPrice: "0x64" }]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 100n);
	});

	it("should apply the 64/63 headroom to the optimistic gas limit and converge", async ({ action, evm }) => {
		// gasUsed 21000, gasRefunded 0 -> optimistic = ((21000 + 0 + 2300) * 64) / 63 = 23669
		// (the 64/63 headroom is applied; without it the value would be 23300).
		// The optimistic limit (23669) is below the full block limit and succeeds, then the binary
		// search narrows the range until it is within the 1.5% error ratio.
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		const result = await action.handle([{ data: "0x1234", from: sender, to: recipient }]);

		// First execution runs with the full block gas limit.
		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 30_000_000n);
		// The optimistic limit includes the 64/63 headroom (23669, not the un-adjusted 23300).
		assert.equal(simulate.getCallArgs(1)[0].gasLimit, 23_669n);
		assert.equal(result, "0x52ad");
	});

	it("should binary-search upward when the optimistic and mid-search executions fail", async ({ action, evm }) => {
		// The unconstrained first run reports gasUsed = 100_000 (gasRefunded 0), but the transaction
		// actually needs at least THRESHOLD = 200_000 gas to succeed. This forces the optimistic guess
		// and several mid-search guesses to fail, exercising the "narrow upward" (minGasLimit = mid) paths.
		const threshold = 200_000n;
		const gasUsed = 100_000n;

		const simulate = stub(evm, "simulate").callsFake(async (context: any) => ({
			receipt: {
				gasRefunded: 0n,
				gasUsed,
				status: context.gasLimit >= threshold ? 1 : 0,
			},
		}));

		const result = await action.handle([{ data: "0x1234", from: sender, to: recipient }]);

		// First execution: full block limit -> success, gasUsed reported as 100_000.
		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 30_000_000n);

		// (a) optimistic limit = ((100_000 + 0 + 2300) * 64) / 63 = 103_923, which is below the true
		// requirement (200_000) so it FAILS -> minGasLimit = 103_923 and the binary search begins.
		assert.equal(simulate.getCallArgs(1)[0].gasLimit, 103_923n);

		// (d) first mid = (30_000_000 + 103_923) / 2 = 15_051_961, which exceeds minGasLimit * 2 = 207_846,
		// so the mid is clamped down to 207_846 (the low-side-favoring bisection). 207_846 >= threshold
		// -> succeeds -> maxGasLimit = 207_846.
		assert.equal(simulate.getCallArgs(2)[0].gasLimit, 207_846n);

		// (b) next mid = (207_846 + 103_923) / 2 = 155_884, below threshold -> FAILS -> minGasLimit = 155_884
		// (search narrows upward again).
		assert.equal(simulate.getCallArgs(3)[0].gasLimit, 155_884n);

		// The converged estimate must be at least the true requirement.
		assert.true(result.startsWith("0x"));
		assert.true(BigInt(result) >= threshold);
	});

	it("should throw RpcError on execution error raised during the optimistic execution", async ({ action, evm }) => {
		// Call 0 = unconstrained max run (success). Call 1 = optimistic run -> raise a raw error, which
		// must surface as an RpcError (the "this should not happen" defensive branch).
		let call = 0;
		stub(evm, "simulate").callsFake(async () => {
			const current = call++;
			if (current === 1) {
				throw new Error("reverted optimistic");
			}
			return { receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 } };
		});

		await assert.rejects(
			() => action.handle([{ data: "0x1234", from: sender, to: recipient }]),
			RpcError,
			"execution reverted: reverted optimistic",
		);
	});

	it("should throw RpcError on execution error raised during a binary-search iteration", async ({ action, evm }) => {
		// Call 0 = unconstrained max run (success), call 1 = optimistic run (success), call 2 = first
		// binary-search iteration -> raise a raw error, which must surface as an RpcError.
		let call = 0;
		stub(evm, "simulate").callsFake(async () => {
			const current = call++;
			if (current >= 2) {
				throw new Error("reverted mid-search");
			}
			return { receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 } };
		});

		await assert.rejects(
			() => action.handle([{ data: "0x1234", from: sender, to: recipient }]),
			RpcError,
			"execution reverted: reverted mid-search",
		);
	});
});
