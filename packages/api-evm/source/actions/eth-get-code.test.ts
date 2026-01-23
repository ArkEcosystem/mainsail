import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { schemas as validationSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { schemas } from "../validation/index.js";
import { EthGetCodeAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetCodeAction;
	validator: Validator;
	evm: any;
}>("EthGetCodeAction", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.evm = {
			codeAt: () => "0x0",
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.app.resolve(EthGetCodeAction);
		context.validator = context.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getCode");
	});

	it("schema should be ok", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(validationSchemas.prefixedQuantityHex);
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getCode", ["0x0000000000000000000000000000000000000000", "latest"]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getCode", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getCode", {}).errors);
	});

	it("should return code", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");
	});
});
