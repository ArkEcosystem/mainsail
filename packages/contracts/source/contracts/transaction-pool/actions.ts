import { StoreChange } from "../state/store.js";

export type CommitRequest = {
	block: string;
	failedTransactions: string[];
	store: StoreChange;
};

export type CommitResponse = boolean;
