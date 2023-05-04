import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { describe, Sandbox } from "../../../core-test-framework";
import { defaults } from "../defaults";
import { Peer } from "../peer";
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
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "p2p");
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);
	});

	each(
		"isValidVersion",
		({ dataset: version, context }) => {
			const peer = new Peer("1.0.0.99", 4002);
			peer.version = version;
			assert.true(isValidVersion(context.sandbox.app, peer));
		},
		["2.6.0", "2.6.666", "2.7.0", "2.8.0", "2.9.0", "2.9.934"],
	);

	each(
		"should be an invalid version",
		({ dataset: version, context }) => {
			const peer = new Peer("1.0.0.99", 4002);
			peer.version = version;
			assert.false(isValidVersion(context.sandbox.app, peer));
		},
		[undefined, "2.4.0", "2.5.0", "1.0.0", "---aaa", "2490", 2, -10.2, {}, true, () => 1, "2.0.0.0"],
	);
});
