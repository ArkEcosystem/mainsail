import { StoreChange } from "../state/store.js";

export type CommitRequest = {
	block: string;
	failedTransactions: string[];
	store: StoreChange;
};
export type CommitResponse = boolean;

export type GetStatusRequest = {};
export type GetStatusResponse = {
	height: number;
	version: string;
};

export type GetTransactionsRequest = {};
export type GetTransactionsResponse = string[];

export type ImportSnapshotsRequest = {
	height: number;
};
export type ImportSnapshotsResponse = boolean;

export type ListSnapshotsRequest = {};
export type ListSnapshotsResponse = number[];
