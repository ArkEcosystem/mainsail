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

		try {
			await action.handle([{ data: "0x1234", from, to: contract }]);
			assert.fail("should have thrown");
		} catch (error) {
			assert.instance(error, RpcError);
			assert.equal(error.message, "execution reverted: out of gas");
		}
	});

	it("should throw RpcError 'execution reverted' when first execution is unsuccessful", async ({ action, evm }) => {
		stub(evm, "simulate").resolvedValue({ receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 0 } });

		try {
			await action.handle([{ data: "0x1234", from, to: contract }]);
			assert.fail("should have thrown");
		} catch (error) {
			assert.instance(error, RpcError);
			assert.equal(error.message, "execution reverted");
		}
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

	it("should converge on the optimistic gas limit when it succeeds", async ({ action, evm }) => {
		// gasUsed 21000, gasRefunded 0 -> optimistic = (21000 + 0 + 2300) * 1 = 23300 = 0x5B04
		// optimistic (23300) < maxGasLimit (30_000_000) and succeeds, so maxGasLimit becomes 23300.
		// binary search: minGasLimit = 20999, error ratio (23300-20999)/23300 ~ 0.0987 > 0.015,
		// continues bisecting until close enough. Final result should be the converged max limit.
		const simulate = stub(evm, "simulate").resolvedValue({
			receipt: { gasRefunded: 0n, gasUsed: 21_000n, status: 1 },
		});

		const result = await action.handle([{ data: "0x1234", from, to: contract }]);

		// First execution runs with the full block gas limit.
		assert.true(simulate.getCallArgs(0)[0].gasLimit === 30_000_000n);
		// Optimistic limit (23300) succeeds, then binary search converges to 21286 = 0x5326.
		assert.equal(result, "0x5326");
	});
});
