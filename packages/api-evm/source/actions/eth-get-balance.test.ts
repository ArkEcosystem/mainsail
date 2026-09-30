import { Identifiers } from "@mainsail/constants";
import { schemas as keccak256Schemas } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "../validation/index.js";
import { EthGetBalanceAction } from "./index.js";

describe<{
	app: Application;
	action: EthGetBalanceAction;
	validator: Contracts.Crypto.Validator;
	evm: any;
}>("EthGetBalanceAction", ({ beforeEach, it, assert, spy }) => {
	let balance = BigInt(0);
	const nonce = BigInt(0);

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

		context.action = context.app.resolve(EthGetBalanceAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBalance");
	});

	it("schema should be array with 2 parameters", ({ action, validator }) => {
		validator.addSchema(keccak256Schemas.address);
		validator.addSchema(schemas.blockTag);
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getBalance", ["0x0000000000000000000000000000000000000000", "latest"])
				.errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getBalance", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBalance", {}).errors);
	});

	it("should return the balance as hex", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");

		balance = BigInt(20);
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x14");
	});

	it("should not use history for the 'latest' tag", async ({ action, evm }) => {
		const getAccountInfo = spy(evm, "getAccountInfo");

		await action.handle(["0x0000000000", "latest"]);

		getAccountInfo.calledOnce();
		getAccountInfo.calledWith("0x0000000000", undefined);
	});

	it("should query historical state for a hex blockTag", async ({ action, evm }) => {
		const getAccountInfo = spy(evm, "getAccountInfo");

		await action.handle(["0x0000000000", "0x7b"]);

		getAccountInfo.calledOnce();
		getAccountInfo.calledWith("0x0000000000", 123n);
	});
});
