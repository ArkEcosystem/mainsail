import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { addressesIndexer, publicKeysIndexer, resignationsIndexer, usernamesIndexer } from "./indexers";

export const registerIndexers = (app: Contracts.Kernel.Application): void => {
	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: addressesIndexer,
		name: Contracts.State.WalletIndexes.Addresses,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: publicKeysIndexer,
		name: Contracts.State.WalletIndexes.PublicKeys,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: usernamesIndexer,
		name: Contracts.State.WalletIndexes.Usernames,
	});

	app.bind(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: resignationsIndexer,
		name: Contracts.State.WalletIndexes.Resignations,
	});
};
