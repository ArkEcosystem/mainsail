import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { schemas as cryptoBlockSchemas } from "@mainsail/crypto-block";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthGetTransactionByBlockHashAndIndex } from "./index.js";

describe<{
	app: Application;
	action: EthGetTransactionByBlockHashAndIndex;
	validator: Contracts.Crypto.Validator;
	database: any;
}>("EthGetTransactionByBlockHashAndIndex", ({ beforeEach, it, assert, stub }) => {
	const blockHash = "cc".repeat(32);

	const makeTransaction = (): any => ({
		blockHash,
		blockNumber: 5n,
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
		transactionIndex: 2,
		v: "1b",
		value: 0n,
	});

	beforeEach(async (context) => {
		context.database = {
			getTransactionByBlockHashAndIndex: async () => undefined,
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.app.resolve(EthGetTransactionByBlockHashAndIndex);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionByBlockHashAndIndex");
	});

	it("schema should validate a block hash and hex index", ({ action, validator }) => {
		validator.addSchema(cryptoBlockSchemas.prefixedBlockHash);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getTransactionByBlockHashAndIndex", [`0x${blockHash}`, "0x2"]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByBlockHashAndIndex", [`0x${blockHash}`]).errors);
		assert.defined(
			validator.validate("jsonRpc_eth_getTransactionByBlockHashAndIndex", [`0x${blockHash}`, 2]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionByBlockHashAndIndex", {}).errors);
	});

	it("should return null if transaction not found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByBlockHashAndIndex").resolvedValue(undefined);

		assert.null(await action.handle([`0x${blockHash}`, "0x2"]));

		spy.calledOnce();
		spy.calledWith(blockHash, 2);
	});

	it("should return the transformed transaction when found", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByBlockHashAndIndex").resolvedValue(makeTransaction());

		const result: any = await action.handle([`0x${blockHash}`, "0x2"]);

		spy.calledWith(blockHash, 2);
		assert.equal(result.blockHash, `0x${blockHash}`);
		assert.equal(result.transactionIndex, "0x2");
		assert.equal(result.type, "0x0");
	});
});
