import { ITransaction } from "../crypto";

export interface SenderState {
	apply(transaction: ITransaction): Promise<void>;
	revert(transaction: ITransaction): Promise<void>;
}
