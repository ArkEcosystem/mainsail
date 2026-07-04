import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { EthGetBlockTransactionCountByNumber } from "./index.js";

describe<{
	app: Application;
	action: EthGetBlockTransactionCountByNumber;
	validator: Contracts.Crypto.Validator;
	database: any;
}>("EthGetBlockTransactionCountByNumber", ({ beforeEach, it, assert, stub }) => {
	beforeEach(async (context) => {
		context.database = {
			getBlockHeader: async () => undefined,
		};

		context.app = new Application();

		context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.app.resolve(EthGetBlockTransactionCountByNumber);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBlockTransactionCountByNumber");
	});

	it("schema should be array with 1 parameter", ({ action, validator }) => {
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", ["0x0", ""]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", {}).errors);
	});

	it("should return null if block not found", async ({ action }) => {
		assert.null(await action.handle(["0x10"]));
	});

	it("should return 0x0 for a block with no transactions", async ({ action, database }) => {
		const spyGetBlockHeader = stub(database, "getBlockHeader").returnValue({ transactionsCount: 0 });

		assert.equal(await action.handle(["0x0"]), "0x0");

		spyGetBlockHeader.calledOnce();
		spyGetBlockHeader.calledWith(0);
	});

	it("should return 0x14 for a block with 20 transactions", async ({ action, database }) => {
		const spyGetBlockHeader = stub(database, "getBlockHeader").returnValue({ transactionsCount: 20 });

		assert.equal(await action.handle(["0x14"]), "0x14");

		spyGetBlockHeader.calledOnce();
		spyGetBlockHeader.calledWith(20);
	});
});
