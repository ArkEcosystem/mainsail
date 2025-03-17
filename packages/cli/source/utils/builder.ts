import { Container } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { AnyObject } from "../contracts.js";

export const Builder = {
	async buildApplication(context?: AnyObject): Promise<Contracts.Kernel.Application> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		if (context) {
			await app.bootstrap({
				flags: context.flags,
				plugins: context.plugins,
			});

			await app.boot();
		}

		return app;
	},
	buildPeerFlags(flags: AnyObject) {
		const config = {
			disableDiscovery: flags.disableDiscovery,
			ignoreMinimumNetworkReach: flags.ignoreMinimumNetworkReach,
			skipDiscovery: flags.skipDiscovery,
		};

		if (flags.launchMode === "seed") {
			config.skipDiscovery = true;
			config.ignoreMinimumNetworkReach = true;
		}

		return config;
	},
};
