import { Application, Container, Contracts } from "@arkecosystem/core-kernel";

import { AnyObject } from "../contracts";

export const buildApplication = async (context?: AnyObject): Promise<Contracts.Kernel.Application> => {
	const app: Contracts.Kernel.Application = new Application(new Container.Container());

	if (context) {
		await app.bootstrap({
			flags: context.flags,
			plugins: context.plugins,
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();
	}

	return app;
};

export const buildPeerFlags = (flags: AnyObject) => {
	const config = {
		disableDiscovery: flags.disableDiscovery,
		ignoreMinimumNetworkReach: flags.ignoreMinimumNetworkReach,
		networkStart: flags.networkStart,
		skipDiscovery: flags.skipDiscovery,
	};

	if (flags.launchMode === "seed") {
		config.skipDiscovery = true;
		config.ignoreMinimumNetworkReach = true;
	}

	return config;
};
