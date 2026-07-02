import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { RpcError } from "@mainsail/exceptions";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { EthEstimateGasAction } from "./index.js";

describe<{
	app: Application;
	action: EthEstimateGasAction;
	validator: Contracts.Crypto.Validator;
	evm: any;
	configuration: any;
	milestone: any;
}>("EthEstimateGasAction", ({ beforeEach, it, assert, stub }) => {
	const from = "0x0000000000000000000000000000000000000009";
	const contract = "0x0000000000000000000000000000000000000010";

	beforeEach(async (context) => {
		context.milestone = {
			block: { maxGasLimit: 30_000_000 },
			evmSpec: "shanghai",
			gas: {
				maximumGasLimit: 2_000_000,
				maximumGasPrice: 1000,
				minimumGasLimit: 21_000,
				minimumGasPrice: 5,
			},
		};

		context.evm = {
			codeAt: async () => "0x",
			getAccountInfo: async () => ({ balance: 0n, nonce: 3n }),
			simulate: async () => ({ receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 } }),
		};

		context.configuration = {
			getHeight: () => 100,
			getMilestone: () => context.milestone,
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "rpc");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(EthEstimateGasAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
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

		// missing required "from"
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", [{ data: "0x1234" }]).errors);
		// too many items
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", [{ from: from }, {}]).errors);
		// not an array
		assert.defined(validator.validate("jsonRpc_eth_estimateGas", {}).errors);
	});

	it("should return default gas for a vanilla transfer to a non-contract recipient", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate");
		const codeAt = stub(evm, "codeAt").resolvedValue("0x");

		// no data, recipient has no code -> 21000 = 0x5208
		assert.equal(await action.handle([{ from, to: from }]), "0x5208");

		codeAt.calledWith(from);
		simulate.neverCalled();
	});

	it("should not short-circuit when recipient is a contract", async ({ action, evm }) => {
		stub(evm, "codeAt").resolvedValue("0x60006000");

		// contract recipient with empty data -> must run estimation, not return default
		const result = await action.handle([{ from, to: contract }]);
		assert.true(result.startsWith("0x"));
		assert.not.equal(result, "0x5208");
	});

	it("should estimate gas via simulation when data is provided", async ({ action, evm }) => {
		// data present -> skip the vanilla-transfer short-circuit entirely
		const codeAt = stub(evm, "codeAt");

		const result = await action.handle([{ data: "0x1234", from, to: contract }]);

		codeAt.neverCalled();
		assert.true(result.startsWith("0x"));
	});

	it("should throw RpcError with message on execution error in first execute", async ({ action, evm }) => {
		stub(evm, "simulate").rejectedValue(new Error("out of gas"));

		await assert.rejects(
			() => action.handle([{ data: "0x1234", from, to: contract }]),
			RpcError,
			"execution reverted: out of gas",
		);
	});

	it("should throw RpcError 'execution reverted' when first execution is unsuccessful", async ({ action, evm }) => {
		stub(evm, "simulate").resolvedValue({ receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 0 } });

		await assert.rejects(
			() => action.handle([{ data: "0x1234", from, to: contract }]),
			RpcError,
			"execution reverted",
		);
	});

	it("should pass user-provided gas as the initial max limit", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		// 0x30D40 = 200_000
		await action.handle([{ data: "0x1234", from, gas: "0x30D40", to: contract }]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 200_000n);
	});

	it("should default max limit to block.maxGasLimit when gas is absent", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		await action.handle([{ data: "0x1234", from, to: contract }]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 30_000_000n);
	});

	it("should use account nonce and default gas price from milestone", async ({ action, evm }) => {
		stub(evm, "getAccountInfo").resolvedValue({ balance: 0n, nonce: 11n });
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		await action.handle([{ data: "0x1234", from, to: contract }]);

		assert.equal(simulate.getCallArgs(0)[0].nonce, 11n);
		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 5n);
	});

	it("should use user-provided gas price when present", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		// 0x64 = 100
		await action.handle([{ data: "0x1234", from, gasPrice: "0x64", to: contract }]);

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

		const result = await action.handle([{ data: "0x1234", from, to: contract }]);

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

		const result = await action.handle([{ data: "0x1234", from, to: contract }]);

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
			() => action.handle([{ data: "0x1234", from, to: contract }]),
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
			() => action.handle([{ data: "0x1234", from, to: contract }]),
			RpcError,
			"execution reverted: reverted mid-search",
		);
	});
});
