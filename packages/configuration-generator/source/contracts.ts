import type { Contracts } from "@mainsail/contracts";

type PartialRecord<K extends PropertyKey, T> = {
	[P in K]?: T;
};

export type EnvironmentData = PartialRecord<string, string | number>;

export type Wallet = {
	address: string;
	passphrase: string;
	keys: Contracts.Crypto.KeyPair;
	consensusKeys: Contracts.Crypto.KeyPair;
	username: string | undefined;
};
