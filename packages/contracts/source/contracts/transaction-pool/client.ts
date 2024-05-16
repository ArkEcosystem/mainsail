import { CommitHandler, Transaction } from "../crypto/index.js";

export interface Client extends CommitHandler {
	getTx(): Promise<Transaction[]>;
}
