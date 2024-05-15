import { Transaction } from "../crypto/index.js";

export interface Client {
	getTx(): Promise<Transaction[]>;
}
