import { IBlock, IKeyPair, ITransactionData } from "./crypto";

export interface Validator {
	keys: IKeyPair | undefined;

	publicKey: string;

	address: string;

	forge(transactions: ITransactionData[], options: Record<string, any>): Promise<IBlock>;
}
