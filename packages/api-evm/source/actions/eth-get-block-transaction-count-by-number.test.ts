import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";
import { schemas as cryptoValidationSchemas } from "@mainsail/crypto-validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { EthGetBlockTransactionCountByNumber } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: EthGetBlockTransactionCountByNumber;
	validator: Validator;
	database: any;
}>("EthGetBlockTransactionCountByHash", ({ beforeEach, it, assert, stub }) => {
	beforeEach(async (context) => {
		context.database = {
			getBlockHeader: async () => undefined,
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.sandbox.app.resolve(EthGetBlockTransactionCountByNumber);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBlockTransactionCountByNumber");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema(cryptoValidationSchemas.prefixedQuantityHex);
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", ["0x0", ""]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByNumber", {}).errors);
	});

	it("should return null if block not found", async ({ action }) => {
		assert.null(await action.handle(["0x10"]));
	});

	it("should return 0x0", async ({ action, database }) => {
		const spyGetBlockHeader = stub(database, "getBlockHeader").returnValue({ transactionsCount: 0 });

		assert.equal(await action.handle(["0x0"]), "0x0");

		spyGetBlockHeader.calledOnce();
		spyGetBlockHeader.calledWith(0);
	});

	it("should return 0x14", async ({ action, database }) => {
		const spyGetBlockHeader = stub(database, "getBlockHeader").returnValue({ transactionsCount: 20 });

		assert.equal(await action.handle(["0x14"]), "0x14");

		spyGetBlockHeader.calledOnce();
		spyGetBlockHeader.calledWith(20);
	});
});
