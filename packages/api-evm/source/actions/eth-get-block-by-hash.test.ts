import { Identifiers } from "@mainsail/constants";
import { schemas as cryptoBlockSchemas } from "@mainsail/crypto-block";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { EthGetBlockByHashAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetBlockByHashAction;
	validator: Contracts.Crypto.Validator;
	database: any;
	configuration: any;
}>("EthGetBlockByHashAction", ({ beforeEach, it, assert, stub }) => {
	const blockHash = "0000000000000000000000000000000000000000000000000000000000000000";

	const block = {
		gasUsed: 21_000,
		hash: blockHash,
		logsBloom: "00",
		number: 20,
		parentHash: "11",
		payloadSize: 256,
		proposer: "0xABCDEF0000000000000000000000000000000000",
		stateRoot: "22",
		timestamp: 1000,
		transactions: [{ hash: "aa" }, { hash: "bb" }],
		transactionsRoot: "33",
	};

	beforeEach(async (context) => {
		context.database = {
			getBlockByHash: async () => undefined,
		};

		context.configuration = {
			getMilestone: () => ({ block: { maxGasLimit: 30_000_000 } }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(EthGetBlockByHashAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBlockByHash");
	});

	it("schema should accept a block hash and boolean", ({ action, validator }) => {
		validator.addSchema(cryptoBlockSchemas.prefixedBlockHash);
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getBlockByHash", [`0x${blockHash}`, true]).errors);
		assert.undefined(validator.validate("jsonRpc_eth_getBlockByHash", [`0x${blockHash}`, false]).errors);

		// missing boolean
		assert.defined(validator.validate("jsonRpc_eth_getBlockByHash", [`0x${blockHash}`]).errors);
		// wrong types
		assert.defined(validator.validate("jsonRpc_eth_getBlockByHash", [1, true]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockByHash", {}).errors);
	});

	it("should return null if block not found", async ({ action }) => {
		assert.null(await action.handle([`0x${blockHash}`, false]));
	});

	it("should look up block by hash without 0x prefix", async ({ action, database }) => {
		const spyGetBlockByHash = stub(database, "getBlockByHash").returnValue(block);

		await action.handle([`0x${blockHash}`, false]);

		spyGetBlockByHash.calledOnce();
		spyGetBlockByHash.calledWith(blockHash);
	});

	it("should transform found block returning tx hashes when transactionObject=false", async ({
		action,
		database,
	}) => {
		stub(database, "getBlockByHash").returnValue(block);

		const result: any = await action.handle([`0x${blockHash}`, false]);

		assert.equal(result.number, "0x14");
		assert.equal(result.hash, `0x${blockHash}`);
		assert.equal(result.parentHash, "0x11");
		assert.equal(result.gasUsed, "0x5208");
		assert.equal(result.gasLimit, "0x1c9c380");
		assert.equal(result.transactions, ["0xaa", "0xbb"]);
		assert.equal(result.uncles, []);
		assert.equal(result.miner, "0xabcdef0000000000000000000000000000000000");
	});

	it("should transform found block returning tx objects when transactionObject=true", async ({
		action,
		database,
	}) => {
		const objBlock = {
			...block,
			transactions: [
				{
					data: "0x",
					from: "0xfrom",
					gasLimit: 21_000,
					gasPrice: 5,
					hash: "aa",
					network: 30,
					nonce: 1,
					r: "r0",
					s: "s0",
					to: "0xto",
					transactionIndex: 0,
					v: "1b",
					value: 100,
				},
			],
		};
		stub(database, "getBlockByHash").returnValue(objBlock);

		const result: any = await action.handle([`0x${blockHash}`, true]);

		assert.equal(result.transactions.length, 1);
		assert.equal(result.transactions[0].hash, "0xaa");
		assert.equal(result.transactions[0].blockHash, `0x${blockHash}`);
		assert.equal(result.transactions[0].blockNumber, "0x14");
		assert.equal(result.transactions[0].from, "0xfrom");
	});
});
