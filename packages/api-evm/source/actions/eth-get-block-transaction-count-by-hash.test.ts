import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { EthGetBlockTransactionCountByHash } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: EthGetBlockTransactionCountByHash;
	validator: Validator;
	database: any;
}>("EthGetBlockTransactionCountByHash", ({ beforeEach, it, assert, stub }) => {
	beforeEach(async (context) => {
		context.database = {
			getBlockHeaderById: async () => undefined,
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.sandbox.app.resolve(EthGetBlockTransactionCountByHash);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBlockTransactionCountByHash");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema({
			$id: "prefixedHex",
			pattern: "^0x[0-9a-f]+$",
			type: "string",
		});
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getBlockTransactionCountByHash", [
				"0x0000000000000000000000000000000000000000000000000000000000000000",
			]).errors,
		);
		assert.defined(
			validator.validate("jsonRpc_eth_getBlockTransactionCountByHash", [
				"0x0000000000000000000000000000000000000000000000000000000000000000",
				"",
			]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByHash", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBlockTransactionCountByHash", {}).errors);
	});

	it("should return null if block not found", async ({ action }) => {
		assert.null(await action.handle(["0x0000000000000000000000000000000000000000000000000000000000000000"]));
	});

	it("should return 0x0", async ({ action, database }) => {
		const spyGetBlockHeaderById = stub(database, "getBlockHeaderById").returnValue({ numberOfTransactions: 0 });

		assert.equal(
			await action.handle(["0x0000000000000000000000000000000000000000000000000000000000000000"]),
			"0x0",
		);

		spyGetBlockHeaderById.calledOnce();
		spyGetBlockHeaderById.calledWith("0000000000000000000000000000000000000000000000000000000000000000");
	});

	it("should return 0x14", async ({ action, database }) => {
		const spyGetBlockHeaderById = stub(database, "getBlockHeaderById").returnValue({ numberOfTransactions: 20 });

		assert.equal(
			await action.handle(["0x0000000000000000000000000000000000000000000000000000000000000000"]),
			"0x14",
		);

		spyGetBlockHeaderById.calledOnce();
		spyGetBlockHeaderById.calledWith("0000000000000000000000000000000000000000000000000000000000000000");
	});
});
