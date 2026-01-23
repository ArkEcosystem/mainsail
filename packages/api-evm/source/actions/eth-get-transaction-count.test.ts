import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { schemas as validationSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { schemas } from "../validation/index.js";
import { EthGetTransactionCount } from "./index.js";

describe<{
	app: Application;
	action: EthGetTransactionCount;
	validator: Validator;
	evm: any;
}>("EthGetTransactionCount", ({ beforeEach, it, assert }) => {
	const balance = BigInt(0);
	let nonce = BigInt(0);

	beforeEach(async (context) => {
		context.evm = {
			getAccountInfo: () => ({
				balance,
				nonce,
			}),
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.app.resolve(EthGetTransactionCount);
		context.validator = context.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionCount");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(validationSchemas.prefixedQuantityHex);
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getTransactionCount", [
				"0x0000000000000000000000000000000000000000",
				"latest",
			]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionCount", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionCount", {}).errors);
	});

	it("should return true", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");

		nonce = BigInt(20);
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x14");
	});
});
