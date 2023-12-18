import { Contracts } from "@mainsail/contracts";

type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

export type EnviromentData = PartialRecord<Contracts.Flags.Flag, string | number>;

export type Wallet = {
	address: string;
	passphrase: string;
	keys: Contracts.Crypto.KeyPair;
	consensusKeys: Contracts.Crypto.KeyPair;
	username: string | undefined;
};
