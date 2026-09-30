import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthChainIdAction } from "./index.js";

describe<{
	app: Application;
	action: EthChainIdAction;
	validator: Contracts.Crypto.Validator;
	configuration: any;
}>("EthChainIdAction", ({ beforeEach, it, assert }) => {
	let chainId = 1;

	beforeEach(async (context) => {
		chainId = 1;

		context.configuration = {
			getNetwork: () => ({ chainId }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.action = context.app.resolve(EthChainIdAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_chainId");
	});

	it("schema should reject any parameters", ({ action, validator }) => {
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_chainId", []).errors);
		assert.defined(validator.validate("jsonRpc_eth_chainId", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_eth_chainId", {}).errors);
	});

	it("should return the network chainId as hex", async ({ action }) => {
		assert.equal(await action.handle([]), "0x1");
	});

	it("should hex-encode a larger chainId", async ({ action, configuration }) => {
		chainId = 30_000;
		configuration.getNetwork = () => ({ chainId });

		assert.equal(await action.handle([]), `0x${(30_000).toString(16)}`);
	});
});
