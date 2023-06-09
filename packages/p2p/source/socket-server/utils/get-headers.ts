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
				.getTagged<Providers.PluginConfiguration>(Identifiers.PluginConfiguration, "plugin", "p2p")
				.get<number>("port"),
		),
		version: app.version(),
	};

	const state: Contracts.State.StateStore = app.get<Contracts.State.StateStore>(Identifiers.StateStore);
	if (state.isStarted()) {
		headers.height = app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService).getLastHeight();
	}

	return headers;
};
