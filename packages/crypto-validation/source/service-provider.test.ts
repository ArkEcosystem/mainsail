import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	validator: Partial<Validator>;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.validator = {
			addKeyword: () => {},
			addSchema: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register", async ({ validator, serviceProvider }) => {
		const spyOnExtend = spy(validator, "addKeyword");
		const spyOnAddSchema = spy(validator, "addSchema");

		await assert.resolves(() => serviceProvider.register());

		spyOnExtend.called();
		spyOnAddSchema.called();
	});
});
