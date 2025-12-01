import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

export const getHeaders = (
	app: Contracts.Kernel.Application,
): {
	version: string | undefined;
	port: number | undefined;
	height: number | undefined;
} => {
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
				.getRequired<number>("server.port"),
		),
		version: app.version(),
	};

	headers.height = app.get<Contracts.State.Store>(Identifiers.State.Store).getBlockNumber();

	return headers;
};
