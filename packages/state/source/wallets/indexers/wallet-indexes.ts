import { Contracts, Identifiers } from "@mainsail/contracts";

import { addressesIndexer, publicKeysIndexer, resignationsIndexer, usernamesIndexer } from "./indexers";

export const registerIndexers = (app: Contracts.Kernel.Application): void => {
	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		indexer: addressesIndexer,
		name: Contracts.State.WalletIndexes.Addresses,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		indexer: publicKeysIndexer,
		name: Contracts.State.WalletIndexes.PublicKeys,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		indexer: usernamesIndexer,
		name: Contracts.State.WalletIndexes.Usernames,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		indexer: resignationsIndexer,
		name: Contracts.State.WalletIndexes.Resignations,
	});
};
