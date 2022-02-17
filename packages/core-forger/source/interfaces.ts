import { Nes } from "@arkecosystem/core-p2p";
import { Interfaces } from "@arkecosystem/crypto";

export interface RelayHost {
	hostname: string;

	port: number;

	socket?: Nes.Client;
}

export interface Delegate {
	keys: Interfaces.IKeyPair | undefined;

	publicKey: string;

	address: string;

	forge(transactions: Interfaces.ITransactionData[], options: Record<string, any>): Interfaces.IBlock;
}
