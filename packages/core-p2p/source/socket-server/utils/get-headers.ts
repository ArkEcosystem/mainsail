import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

export const getHeaders = (app: Contracts.Kernel.Application) => {
	const headers: {
		version: string | undefined;
		port: number | undefined;
		height: number | undefined;
	} = {
		height: undefined,
		port: Number(
			app
				.getTagged<Providers.PluginConfiguration>(Identifiers.PluginConfiguration, "plugin", "core-p2p")
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
