import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

export const getHeaders = (app: Contracts.Kernel.Application) => {
	const headers: {
		version: string | undefined;
		port: number | undefined;
		height: number | undefined;
	} = {
		height: undefined,
		port: Number(
			app
				.getTagged<Providers.PluginConfiguration>(Identifiers.ServiceProvider.Configuration, "plugin", "p2p")
				.get<number>("port"),
		),
		version: app.version(),
	};

	headers.height = app.get<Contracts.State.Store>(Identifiers.State.Store).getHeight();

	return headers;
};
