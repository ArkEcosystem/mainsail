import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../test-framework";
import { ServiceProvider } from "./service-provider";

type Context = {
	validator: Validator;
	sandbox: Sandbox;
};

describe<{
	sandbox: Sandbox;
	validator: Partial<Validator>;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.validator = {
			addKeyword: () => {},
			addSchema: () => {},
		};

		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("should register", async ({ validator, serviceProvider }) => {
		const spyOnExtend = spy(validator, "addKeyword");
		const spyOnAddSchema = spy(validator, "addSchema");

		await assert.resolves(() => serviceProvider.register());

		spyOnExtend.called();
		spyOnAddSchema.called();
	});
});
