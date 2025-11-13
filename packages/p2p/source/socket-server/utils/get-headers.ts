import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

export const getHeaders = (app: Contracts.Kernel.Application) => {
	const headers: {
		version: string | undefined;
		port: number | undefined;
		height: number | undefined;
	} = {
		height: undefined,
		port: Number(
			app
				.getTagged<Contracts.Kernel.PluginConfiguration>(
					Identifiers.ServiceProvider.Configuration,
					"plugin",
					"p2p",
				)
				.get<number>("port"),
		),
		version: app.version(),
	};

	headers.height = app.get<Contracts.State.Store>(Identifiers.State.Store).getBlockNumber();

	return headers;
};
