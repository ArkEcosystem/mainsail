import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});
});
