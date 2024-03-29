import { Contracts } from "@mainsail/contracts";

type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

export type EnvironmentData = PartialRecord<Contracts.Kernel.EnvironmentVariable, string | number>;

export type Wallet = {
	address: string;
	passphrase: string;
	keys: Contracts.Crypto.KeyPair;
	consensusKeys: Contracts.Crypto.KeyPair;
	username: string | undefined;
};
