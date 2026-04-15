import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { EthGetStorageAtAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetStorageAtAction;
	validator: Contracts.Crypto.Validator;
	evm: any;
}>("EthGetStorageAtAction", ({ beforeEach, it, assert, spy }) => {
	beforeEach(async (context) => {
		context.evm = {
			storageAt: () => "0x0",
		};

		context.app = new Application();

		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.app.resolve(EthGetStorageAtAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getStorageAt");
	});

	it("schema should be ok", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getStorageAt", [
				"0x0000000000000000000000000000000000000000",
				"0x0",
				"latest",
			]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getStorageAt", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getStorageAt", {}).errors);
		assert.equal(
			validator.validate("jsonRpc_eth_getStorageAt", [
				"0x0000000000000000000000000000000000000000",
				"0x00000000000000000000000000000000000000000000000000000000000000000",
				"latest",
			]).errors![0].message,
			"must NOT have more than 66 characters",
		);
	});

	it("should return code", async ({ action, evm }) => {
		const spyStorageAt = spy(evm, "storageAt");

		assert.equal(await action.handle(["0x0000000000", "0x0", "latest"]), "0x0");
		spyStorageAt.calledOnce();
		spyStorageAt.calledWith("0x0000000000", BigInt(0));
	});
});
