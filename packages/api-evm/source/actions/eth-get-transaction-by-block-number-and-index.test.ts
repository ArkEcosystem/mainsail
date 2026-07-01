import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthGetTransactionByBlockNumberAndIndex } from "./index.js";

describe<{
	app: Application;
	action: EthGetTransactionByBlockNumberAndIndex;
	validator: Contracts.Crypto.Validator;
	database: any;
}>("EthGetTransactionByBlockNumberAndIndex", ({ beforeEach, it, assert, stub }) => {
	const makeTransaction = (): any => ({
		blockHash: "cc".repeat(32),
		blockNumber: 16n,
		data: "0x",
		from: "0x1111111111111111111111111111111111111111",
		gasLimit: 21_000n,
		gasPrice: 1n,
		hash: "dd".repeat(32),
		network: 30n,
		nonce: 3n,
		r: "1a",
		s: "2b",
		to: "0x2222222222222222222222222222222222222222",
		transactionIndex: 3,
		v: "1b",
		value: 0n,
	});

	beforeEach(async (context) => {
		context.database = {
			getTransactionByBlockNumberAndIndex: async () => undefined,
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.app.resolve(EthGetTransactionByBlockNumberAndIndex);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionByBlockNumberAndIndex");
	});

	it("schema should validate two hex quantities", ({ action, validator }) => {
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getTransactionByBlockNumberAndIndex", ["0x10", "0x3"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByBlockNumberAndIndex", ["0x10"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByBlockNumberAndIndex", [16, 3]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByBlockNumberAndIndex", {}).errors);
	});

	it("should return null if transaction not found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByBlockNumberAndIndex").resolvedValue(undefined);

		assert.null(await action.handle(["0x10", "0x3"]));

		spy.calledOnce();
		spy.calledWith(16, 3);
	});

	it("should return the transformed transaction when found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByBlockNumberAndIndex").resolvedValue(makeTransaction());

		const result: any = await action.handle(["0x10", "0x3"]);

		spy.calledWith(16, 3);
		assert.equal(result.blockNumber, "0x10");
		assert.equal(result.transactionIndex, "0x3");
		assert.equal(result.type, "0x0");
	});
});
