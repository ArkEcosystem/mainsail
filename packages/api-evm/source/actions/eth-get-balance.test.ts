import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describeSkip, Sandbox } from "../../../test-framework/source";
import { EthGetBalanceAction } from "./index.js";

describeSkip<{
	sandbox: Sandbox;
	action: EthGetBalanceAction;
	validator: Validator;
	state: any;
}>("EthGetBalanceAction", ({ beforeEach, it, assert }) => {
	let balance = 0;
	let hasByAddress = true;

	beforeEach(async (context) => {
		const walletRepository = {
			findByAddress: (address: string) => ({
				getBalance: () => balance,
			}),
			hasByAddress: (address: string) => hasByAddress,
		};

		context.state = {
			getStore: () => ({
				walletRepository,
			}),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue(context.state);

		context.action = context.sandbox.app.resolve(EthGetBalanceAction);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getBalance");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema({
			$id: "address",
			allOf: [
				{
					maxLength: 42,
					minLength: 42,
					pattern: "^0x[0123456789a-fA-F]+$",
				},
			],
			type: "string",
		});
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getBalance", ["0x0000000000000000000000000000000000000000", "latest"])
				.errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getBalance", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getBalance", {}).errors);
	});

	it("should return true", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");

		balance = 20;
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x14");

		hasByAddress = false;
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");
	});
});
