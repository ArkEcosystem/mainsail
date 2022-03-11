import { Application } from "@arkecosystem/core-kernel";

import { describe } from "../../../core-test-framework";
import { Builder } from "./builder";

describe("buildApplication", ({ it, stub }) => {
	it("should build an application instance and call bootstrap and boot", async () => {
		const spyBootstrap = stub(Application.prototype, "bootstrap");
		const spyBoot = stub(Application.prototype, "boot");

		await Builder.buildApplication({});

		spyBootstrap.calledOnce();
		spyBoot.calledOnce();
	});

	it("should build an application instance and not call bootstrap or boot", async () => {
		const spyBootstrap = stub(Application.prototype, "bootstrap");
		const spyBoot = stub(Application.prototype, "boot");

		await Builder.buildApplication();

		spyBootstrap.neverCalled();
		spyBoot.neverCalled();
	});
});

describe("buildPeerFlags", ({ it, assert }) => {
	it("should build the configuration object", () => {
		const flags = {
			disableDiscovery: "disableDiscovery",
			ignoreMinimumNetworkReach: "ignoreMinimumNetworkReach",
			networkStart: "networkStart",
			skipDiscovery: "skipDiscovery",
		};

		assert.equal(Builder.buildPeerFlags(flags), flags);
	});

	it("should handle seed mode", () => {
		const flags = {
			disableDiscovery: "disableDiscovery",
			ignoreMinimumNetworkReach: "ignoreMinimumNetworkReach",
			networkStart: "networkStart",
			skipDiscovery: "skipDiscovery",
		};

		assert.equal(Builder.buildPeerFlags({ ...flags, launchMode: "seed" }), {
			...flags,
			ignoreMinimumNetworkReach: true,
			skipDiscovery: true,
		});
	});
});
