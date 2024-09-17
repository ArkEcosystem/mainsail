import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { Configuration } from "../../../crypto-config/distribution/index";
import { describe, Sandbox } from "../../../test-framework/source";
import { formatCurrency } from "./format-currency.js";
import { BigNumber } from "@mainsail/utils";

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("formatCurrency", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
		context.configuration.setConfig(crypto as any);
	});

	it("should format currency", ({ configuration }) => {
		assert.equal(formatCurrency(configuration, BigNumber.ONE), "0.000000000000000001 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.ZERO), "0 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.make(1e18)), "1 TѦ");
		assert.equal(formatCurrency(configuration, BigNumber.make(1e18).times(100)), "100 TѦ");
	});
});
