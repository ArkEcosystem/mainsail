import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { EthGetTransactionCount } from "./index.js";

describe<{
	app: Application;
	action: EthGetTransactionCount;
	validator: Contracts.Crypto.Validator;
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

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.app.resolve(EthGetTransactionCount);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionCount");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
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
