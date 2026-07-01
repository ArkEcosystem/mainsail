import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { RpcError } from "@mainsail/exceptions";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { CallAction } from "./index.js";

describe<{
	app: Application;
	action: CallAction;
	validator: Contracts.Crypto.Validator;
	evm: any;
	configuration: any;
	milestone: any;
}>("CallAction", ({ beforeEach, it, assert, stub }) => {
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
			getAccountInfo: async () => ({ balance: 0n, nonce: 7n }),
			simulate: async () => ({ receipt: { gasUsed: 21_000n, output: Buffer.from("abcd", "hex"), status: 1 } }),
		};

		context.configuration = {
			getHeight: () => 100,
			getMilestone: () => context.milestone,
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "rpc");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(CallAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_call");
	});

	it("schema should validate good and bad params", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_call", [
				{
					data: "0x1234",
					from: "0x0000000000000000000000000000000000000000",
					gas: "0x5208",
					to: "0x0000000000000000000000000000000000000001",
				},
				"latest",
			]).errors,
		);

		// missing required "data"
		assert.defined(validator.validate("jsonRpc_eth_call", [{}, "latest"]).errors);
		// only one item
		assert.defined(validator.validate("jsonRpc_eth_call", [{ data: "0x1234" }]).errors);
		// not an array
		assert.defined(validator.validate("jsonRpc_eth_call", {}).errors);
	});

	it("should return 0x-prefixed hex output on success", async ({ action }) => {
		assert.equal(await action.handle([{ data: "0x1234" }, "latest"]), "0xabcd");
	});

	it("should throw RpcError 'execution reverted' with data when status !== 1", async ({ action, evm }) => {
		stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.from("dead", "hex"), status: 0 } });

		await assert.rejects(async () => action.handle([{ data: "0x1234" }, "latest"]), "execution reverted");

		try {
			await action.handle([{ data: "0x1234" }, "latest"]);
			assert.fail("should have thrown");
		} catch (error) {
			assert.instance(error, RpcError);
			assert.equal(error.message, "execution reverted");
			assert.equal(error.data, "0xdead");
		}
	});

	it("should throw RpcError with undefined data when reverted without output", async ({ action, evm }) => {
		stub(evm, "simulate").resolvedValue({ receipt: { output: undefined, status: 0 } });

		try {
			await action.handle([{ data: "0x1234" }, "latest"]);
			assert.fail("should have thrown");
		} catch (error) {
			assert.instance(error, RpcError);
			assert.undefined(error.data);
		}
	});

	it("should wrap a non-RpcError thrown by simulate", async ({ action, evm }) => {
		stub(evm, "simulate").rejectedValue(new Error("boom"));

		try {
			await action.handle([{ data: "0x1234" }, "latest"]);
			assert.fail("should have thrown");
		} catch (error) {
			assert.instance(error, RpcError);
			assert.equal(error.message, "execution reverted: boom");
		}
	});

	it("should cap gas limit above maximum down to maximum", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0x2FAF080 = 50_000_000 > maximumGasLimit (2_000_000)
		await action.handle([{ data: "0x", gas: "0x2FAF080" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 2_000_000n);
	});

	it("should raise gas limit below minimum up to minimum", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0x64 = 100 < minimumGasLimit (21_000)
		await action.handle([{ data: "0x", gas: "0x64" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 21_000n);
	});

	it("should keep gas limit within bounds as-is", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0xC350 = 50_000 within [21_000, 2_000_000]
		await action.handle([{ data: "0x", gas: "0xC350" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 50_000n);
	});

	it("should default gas limit to maximum when missing", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		await action.handle([{ data: "0x" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasLimit, 2_000_000n);
	});

	it("should accept gas price 0 for view calls", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		await action.handle([{ data: "0x", gasPrice: "0x0" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 0n);
	});

	it("should raise gas price below minimum up to minimum", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0x1 = 1 < minimumGasPrice (5)
		await action.handle([{ data: "0x", gasPrice: "0x1" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 5n);
	});

	it("should cap gas price above maximum down to maximum", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0x2710 = 10_000 > maximumGasPrice (1000)
		await action.handle([{ data: "0x", gasPrice: "0x2710" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 1000n);
	});

	it("should keep gas price within bounds as-is", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		// 0x64 = 100 within [5, 1000]
		await action.handle([{ data: "0x", gasPrice: "0x64" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 100n);
	});

	it("should default gas price to 0 when missing", async ({ action, evm }) => {
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		await action.handle([{ data: "0x" }, "latest"]);

		assert.equal(simulate.getCallArgs(0)[0].gasPrice, 0n);
	});

	it("should read nonce from account info when 'from' is present", async ({ action, evm }) => {
		const getAccountInfo = stub(evm, "getAccountInfo").resolvedValue({ balance: 0n, nonce: 42n });
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		await action.handle([{ data: "0x", from: "0x0000000000000000000000000000000000000009" }, "latest"]);

		getAccountInfo.calledWith("0x0000000000000000000000000000000000000009");
		assert.equal(simulate.getCallArgs(0)[0].nonce, 42n);
	});

	it("should use nonce 0 and zeroAddress when 'from' is absent", async ({ action, evm }) => {
		const getAccountInfo = stub(evm, "getAccountInfo");
		const simulate = stub(evm, "simulate").resolvedValue({ receipt: { output: Buffer.alloc(0), status: 1 } });

		await action.handle([{ data: "0x" }, "latest"]);

		getAccountInfo.neverCalled();
		assert.equal(simulate.getCallArgs(0)[0].nonce, 0n);
		assert.equal(simulate.getCallArgs(0)[0].from, "0x0000000000000000000000000000000000000000");
	});
});
