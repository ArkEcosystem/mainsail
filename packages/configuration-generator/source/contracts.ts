import { Contracts } from "@mainsail/contracts";
import { EnvironmentVariable } from "@mainsail/constants";

type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

export type EnvironmentData = PartialRecord<EnvironmentVariable, string | number>;

export type Wallet = {
	address: string;
	passphrase: string;
	keys: Contracts.Crypto.KeyPair;
	consensusKeys: Contracts.Crypto.KeyPair;
	username: string | undefined;
};
