import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { describe, Sandbox } from "../../../test-framework/source";
import { defaults } from "../defaults";
import { isValidVersion } from "./is-valid-version";

describe<{
	sandbox: Sandbox;
}>("isValidVersion", ({ it, assert, each, beforeEach }) => {
	const configuration = {
		get: () => "testnet",
		getMilestone: () => ({
			p2p: {
				minimumVersions: ["^2.6.0"],
			},
		}),
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "p2p");
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);
	});

	each(
		"isValidVersion",
		({ dataset: version, context }) => {
			assert.true(isValidVersion(context.sandbox.app, version));
		},
		["2.6.0", "2.6.666", "2.7.0", "2.8.0", "2.9.0", "2.9.934"],
	);

	each(
		"should be an invalid version",
		({ dataset: version, context }) => {
			assert.false(isValidVersion(context.sandbox.app, version));
		},
		[undefined, "2.4.0", "2.5.0", "1.0.0", "---aaa", "2490", 2, -10.2, {}, true, () => 1, "2.0.0.0"],
	);
});
