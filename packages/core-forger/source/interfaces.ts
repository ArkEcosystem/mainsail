import { Contracts } from "@arkecosystem/core-contracts";

export interface Validator {
	keys: Contracts.Crypto.IKeyPair | undefined;

	publicKey: string;

	address: string;

	forge(
		transactions: Contracts.Crypto.ITransactionData[],
		options: Record<string, any>,
	): Promise<Contracts.Crypto.IBlock>;
}
