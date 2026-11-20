import { Identifiers } from "@mainsail/constants";
import { Providers } from "@mainsail/kernel";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import semver from "semver";

import { defaults } from "./defaults";
import { isValidVersion } from "./is-valid-version";

describe<{
	app: Application;
	network: { name: string };
	milestone: { p2p?: { minimumVersions: string[] } };
}>("isValidVersion", ({ it, assert, each, beforeEach }) => {
	beforeEach((context) => {
		context.network = { name: "devnet" };
		context.milestone = { p2p: { minimumVersions: ["^2.6.0"] } };

		const configuration = {
			getMilestone: () => context.milestone,
			getNetwork: () => context.network,
		};

		context.app = new Application();

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTagged("plugin", "p2p-websocket");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);
	});

	each(
		"isValidVersion",
		({ dataset: version, context }) => {
			assert.true(isValidVersion(context.app, version));
		},
		["2.6.0", "2.6.666", "2.7.0", "2.8.0", "2.9.0", "2.9.934"],
	);

	each(
		"should be an invalid version",
		({ dataset: version, context }) => {
			assert.false(isValidVersion(context.app, version));
		},
		[undefined, "2.4.0", "2.5.0", "1.0.0", "---aaa", "2490", 2, -10.2, {}, true, () => 1, "2.0.0.0"],
	);

	// Without versions in the milestone the setting of the package counts, by default ["^0.0.1"].
	each(
		"default minimumVersions - should accept the first release and its prereleases:",
		({ dataset: version, context }) => {
			context.milestone = {};

			assert.true(isValidVersion(context.app, version));
		},
		["0.0.1", "0.0.1-rc.9", "0.0.1-rc.10", "0.0.1-alpha.0"],
	);

	each(
		"default minimumVersions - should not accept a later release or its prereleases:",
		({ dataset: version, context }) => {
			context.milestone = {};

			assert.false(isValidVersion(context.app, version));
		},
		["0.0.2", "0.0.2-rc.1", "0.1.0", "1.0.0"],
	);

	it("default minimumVersions - should accept the release but no prerelease on mainnet", (context) => {
		context.network.name = "mainnet";
		context.milestone = {};

		assert.true(isValidVersion(context.app, "0.0.1"));
		assert.false(isValidVersion(context.app, "0.0.1-rc.9"));
	});

	// The reason semver is pinned (see the TODO in is-valid-version.ts and scripts/deps/update.sh): up to
	// 7.8.2 an exact "^0.0.x" range opens to the prereleases of its lower bound when prereleases are
	// included. From 7.8.3 on the lower bound is ">=0.0.1", and every 0.0.1-rc build fails the default.
	it("should run on a semver that opens the default range to the prereleases of 0.0.1", () => {
		assert.equal(new semver.Range("^0.0.1", { includePrerelease: true }).range, ">=0.0.1-0 <0.0.2-0");
		assert.true(semver.satisfies("0.0.1-rc.9", "^0.0.1", { includePrerelease: true }));
	});
});
