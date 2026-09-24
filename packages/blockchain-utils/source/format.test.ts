import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { formatCurrency } from "./format.js";

describe<{
	app: Application;
	configuration: Contracts.Crypto.Configuration;
}>("formatCurrency", ({ assert, beforeEach, it }) => {
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
		assert.equal(formatCurrency(configuration, 10n ** 18n), "1 TѦ");
		assert.equal(formatCurrency(configuration, 10n ** 18n * 100n), "100 TѦ");
	});

	it("should keep every digit of large amounts", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, 10n ** 18n + 1n), "1.000000000000000001 TѦ");
		assert.equal(formatCurrency(configuration, 123_456_789_012_345_678_901n), "123.456789012345678901 TѦ");
		assert.equal(formatCurrency(configuration, 1234n * 10n ** 18n + 5n * 10n ** 17n), "1,234.5 TѦ");
	});

	it("should trim trailing zeros of the fraction", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, 15n * 10n ** 17n), "1.5 TѦ");
		assert.equal(formatCurrency(configuration, 10n ** 17n), "0.1 TѦ");
	});

	it("should format negative amounts", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, -(15n * 10n ** 17n)), "-1.5 TѦ");
	});

	it("should throw if the denomination is 0", ({ configuration }) => {
		const milestones = configuration.getMilestones();
		milestones[0].satoshi.denomination = 0;
		configuration.set("milestones", milestones);

		assert.throws(() => formatCurrency(configuration, 1n), "Invalid denomination");
	});
});
