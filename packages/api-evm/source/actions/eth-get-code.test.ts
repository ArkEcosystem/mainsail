import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { EthGetCodeAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetCodeAction;
	validator: Contracts.Crypto.Validator;
	evm: any;
}>("EthGetCodeAction", ({ beforeEach, it, assert, spy }) => {
	beforeEach(async (context) => {
		context.evm = {
			codeAt: () => "0x0",
		};

		context.app = new Application();

		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.app.resolve(EthGetCodeAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getCode");
	});

	it("schema should validate address and blockTag", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
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

	it("should not use history for the 'latest' tag", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");

		await action.handle(["0x0000000000", "latest"]);

		codeAt.calledOnce();
		codeAt.calledWith("0x0000000000", undefined);
	});

	it("should query historical code for a hex blockTag", async ({ action, evm }) => {
		const codeAt = spy(evm, "codeAt");

		await action.handle(["0x0000000000", "0x7b"]);

		codeAt.calledOnce();
		codeAt.calledWith("0x0000000000", 123n);
	});
});
