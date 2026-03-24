import { Identifiers } from "@mainsail/constants";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { Configuration } from "../../crypto-config/distribution/index";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { formatCurrency } from "./format.js";
import { cp } from "fs";

describe<{
	app: Application;
	configuration: Configuration;
}>("formatCurrency", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.app.get<Configuration>(Identifiers.Cryptography.Configuration);
		context.configuration.setConfig(crypto as any);
	});

	it("should format currency", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, BigNumber.ONE), "0.000000000000000001 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.ZERO), "0 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.make(1e18)), "1 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.make(1e18).times(100)), "100 TѦ");
	});
});
