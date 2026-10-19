import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthGasPriceAction } from "./index.js";

describe<{
	app: Application;
	action: EthGasPriceAction;
	validator: Contracts.Crypto.Validator;
	configuration: any;
}>("EthGasPriceAction", ({ beforeEach, it, assert }) => {
	let minimumGasPrice = 5;

	beforeEach(async (context) => {
		minimumGasPrice = 5;

		context.configuration = {
			getMilestone: () => ({ gas: { minimumGasPrice } }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(EthGasPriceAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_gasPrice");
	});

	it("schema should reject any parameters", ({ action, validator }) => {
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_gasPrice", []).errors);
		assert.defined(validator.validate("jsonRpc_eth_gasPrice", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_gasPrice", {}).errors);
	});

	it("should return the milestone minimumGasPrice as hex", async ({ action }) => {
		assert.equal(await action.handle(), "0x5");
	});

	it("should hex-encode a larger gas price", async ({ action, configuration }) => {
		minimumGasPrice = 255;
		configuration.getMilestone = () => ({ gas: { minimumGasPrice } });

		assert.equal(await action.handle(), "0xff");
	});
});
