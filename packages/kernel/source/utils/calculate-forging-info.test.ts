import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { Configuration } from "../../../crypto-config";
import { describe, Sandbox } from "../../../test-framework";
import { getMilestonesWhichAffectActiveValidatorCount } from "./calculate-forging-info";

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("getMilestonesWhichAffectActiveDelegateCount", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
	});

	it("should return milestones which changes delegate count", ({ configuration }) => {
		configuration.setConfig({
			...crypto,
			milestones: [{ activeValidators: 4, height: 1 }],
		});

		const milestones = [
			{ activeValidators: 4, height: 0 },
			{ activeValidators: 4, height: 1 },
			{ activeValidators: 4, height: 5 },
			{ activeValidators: 8, height: 9 },
			{ activeValidators: 8, height: 15 },
		];

		const config = { ...crypto, milestones };
		configuration.setConfig({ ...crypto, milestones: milestones });

		assert.length(getMilestonesWhichAffectActiveValidatorCount(configuration), 2);
	});
});
