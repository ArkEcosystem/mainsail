import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

export const Builder = {
	async buildApplication(context?: {
		flags: Contracts.Types.JsonObject;
		plugins: Contracts.Types.JsonObject;
	}): Promise<Contracts.Kernel.Application> {
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
	buildPeerFlags(flags: Contracts.Cli.AnyObject): {
		disableDiscovery: boolean;
		ignoreMinimumNetworkReach: boolean;
		skipDiscovery: boolean;
	} {
		const config = {
			disableDiscovery: flags.disableDiscovery as boolean,
			ignoreMinimumNetworkReach: flags.ignoreMinimumNetworkReach as boolean,
			skipDiscovery: flags.skipDiscovery as boolean,
		};

		if (flags.launchMode === "seed") {
			config.skipDiscovery = true;
			config.ignoreMinimumNetworkReach = true;
		}

		return config;
	},
};
