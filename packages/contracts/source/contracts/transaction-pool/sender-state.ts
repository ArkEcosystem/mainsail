import { ITransaction } from "../crypto";

export interface SenderState {
	configure(publicKey: string): Promise<SenderState>;
	apply(transaction: ITransaction): Promise<void>;
	revert(transaction: ITransaction): Promise<void>;
}
