import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthGetTransactionByHash } from "./index.js";

describe<{
	app: Application;
	action: EthGetTransactionByHash;
	validator: Contracts.Crypto.Validator;
	database: any;
}>("EthGetTransactionByHash", ({ beforeEach, it, assert, stub }) => {
	const txHash = "a".repeat(64);

	const makeTransaction = (): any => ({
		blockHash: "b".repeat(64),
		blockNumber: 1n,
		data: "0x",
		from: "0x1111111111111111111111111111111111111111",
		gasLimit: 21_000n,
		gasPrice: 1n,
		hash: txHash,
		network: 30n,
		nonce: 0n,
		r: "e".repeat(64),
		s: "f".repeat(64),
		to: "0x2222222222222222222222222222222222222222",
		transactionIndex: 0,
		v: 1,
		value: 0n,
	});

	beforeEach(async (context) => {
		context.database = {
			getTransactionByHash: async () => undefined,
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.app.resolve(EthGetTransactionByHash);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionByHash");
	});

	it("schema should validate a single prefixed transaction hash", ({ action, validator }) => {
		validator.addSchema({
			$id: "prefixedTransactionHash",
			allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "prefixedQuantityHex" }],
			type: "string",
		});
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getTransactionByHash", [`0x${txHash}`]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByHash", [`0x${txHash}`, ""]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByHash", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByHash", {}).errors);
	});

	it("should return null if transaction not found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByHash").resolvedValue(undefined);

		assert.null(await action.handle([`0x${txHash}`]));

		spy.calledOnce();
		spy.calledWith(txHash);
	});

	it("should return the transformed transaction when found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByHash").resolvedValue(makeTransaction());

		const result: any = await action.handle([`0x${txHash}`]);

		spy.calledWith(txHash);
		assert.equal(result.hash, `0x${txHash}`);
		assert.equal(result.from, "0x1111111111111111111111111111111111111111");
		assert.equal(result.type, "0x0");
		assert.equal(result.gas, "0x5208");
	});
});
