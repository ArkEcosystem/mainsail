import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { formatCurrency } from "./format.js";
import { Contracts } from "@mainsail/contracts";

describe<{
	app: Application;
	configuration: Contracts.Crypto.Configuration;
}>("formatCurrency", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		context.configuration.setConfig(crypto as any);
	});

	it("should format currency", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, 1n), "0.000000000000000001 TѦ");
		assert.equal(formatCurrency(configuration, 0n), "0 TѦ");
		assert.equal(formatCurrency(configuration, BigInt(1e18)), "1 TѦ");
		assert.equal(formatCurrency(configuration, BigInt(1e18) * 100n), "100 TѦ");
	});

	each(
		"should throw if decimals are invalid",
		({ dataset: data, context: { configuration } }) => {
			const milestones = configuration.getMilestones();
			milestones[0].satoshi.decimals = data;
			configuration.set("milestones", milestones);
			assert.throws(() => formatCurrency(configuration, 1n), "Invalid decimals");
		},
		[21, 100],
	);
});
