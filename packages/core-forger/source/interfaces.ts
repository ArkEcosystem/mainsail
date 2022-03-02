import { Crypto } from "@arkecosystem/core-contracts";
import { Nes } from "@arkecosystem/core-p2p";

export interface RelayHost {
	hostname: string;

	port: number;

	socket?: Nes.Client;
}

export interface Delegate {
	keys: Crypto.IKeyPair | undefined;

	publicKey: string;

	address: string;

	forge(transactions: Crypto.ITransactionData[], options: Record<string, any>): Promise<Crypto.IBlock>;
}
