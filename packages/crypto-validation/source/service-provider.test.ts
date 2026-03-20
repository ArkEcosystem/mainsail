import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";
import { describe } from "@mainsail/test-runner";
import { schemas } from "./schemas";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	validator: Validator;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
		context.validator = context.app.get<Validator>(Identifiers.Cryptography.Validator);
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register", async ({ validator, serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());

		assert.true(validator.hasSchema("alphanumeric"));
		assert.true(validator.hasSchema("hex"));
		assert.true(validator.hasSchema("prefixedDataHex"));
		assert.true(validator.hasSchema("prefixedQuantityHex"));
	});
});
