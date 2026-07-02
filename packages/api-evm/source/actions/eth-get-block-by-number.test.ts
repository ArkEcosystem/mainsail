import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { EthGetBlockByNumberAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetBlockByNumberAction;
	validator: Contracts.Crypto.Validator;
	database: any;
	stateStore: any;
	configuration: any;
}>("EthGetBlockByNumberAction", ({ beforeEach, it, assert, stub }) => {
	const block = {
		gasUsed: 21_000,
		hash: "abcd",
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
			getBlock: async () => undefined,
		};

		context.stateStore = {
			getBlockNumber: () => 99,
		};

		context.configuration = {
			getMilestone: () => ({ block: { maxGasLimit: 30_000_000 } }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(EthGetBlockByNumberAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBlockByNumber");
	});

	it("schema should accept a blockTag and boolean", ({ action, validator }) => {
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getBlockByNumber", ["0x14", true]).errors);
		assert.undefined(validator.validate("jsonRpc_eth_getBlockByNumber", ["latest", false]).errors);

		assert.defined(validator.validate("jsonRpc_eth_getBlockByNumber", ["0x14"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockByNumber", [1, true]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockByNumber", {}).errors);
	});

	it("should return null if block not found", async ({ action }) => {
		assert.null(await action.handle(["0x14", false]));
	});

	it("should resolve a hex blockTag to a height for the lookup", async ({ action, database }) => {
		const spyGetBlock = stub(database, "getBlock").returnValue(block);

		await action.handle(["0x14", false]);

		spyGetBlock.calledOnce();
		spyGetBlock.calledWith(20);
	});

	it("should resolve 'latest' blockTag via stateStore.getBlockNumber", async ({ action, database, stateStore }) => {
		const spyGetBlockNumber = stub(stateStore, "getBlockNumber").returnValue(99);
		const spyGetBlock = stub(database, "getBlock").returnValue(block);

		await action.handle(["latest", false]);

		spyGetBlockNumber.calledOnce();
		spyGetBlock.calledWith(99);
	});

	it("should throw on an invalid blockTag", async ({ action }) => {
		await assert.rejects(() => action.handle(["nope" as any, false]), "invalid blockTag:nope");
	});

	it("should transform found block returning tx hashes when transactionObject=false", async ({
		action,
		database,
	}) => {
		stub(database, "getBlock").returnValue(block);

		const result: any = await action.handle(["0x14", false]);

		assert.equal(result.number, "0x14");
		assert.equal(result.hash, "0xabcd");
		assert.equal(result.transactions, ["0xaa", "0xbb"]);
	});
});
