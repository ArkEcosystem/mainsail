import { Contracts } from "@arkecosystem/core-contracts";
import { Nes } from "@arkecosystem/core-p2p";

export interface RelayHost {
	hostname: string;

	port: number;

	socket?: Nes.Client;
}

export interface Validator {
	keys: Contracts.Crypto.IKeyPair | undefined;

	publicKey: string;

	address: string;

	forge(
		transactions: Contracts.Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Contracts.Crypto.IBlock>;
}
