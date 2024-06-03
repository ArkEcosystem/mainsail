import { CommitHandler, Transaction } from "../crypto/index.js";
import { Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	getTransactionBytes(): Promise<Buffer[]>;
	importSnapshot(height: number): Promise<void>;
	commit(unit: any): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends Omit<WorkerScriptHandler, "commit">, CommitHandler {
	getQueueSize(): number;
	kill(): Promise<number>;
	setFailedTransactions(transactions: Transaction[]): void;
}

export interface WorkerPool {
	boot(): Promise<void>;
	shutdown(): Promise<void>;
	getWorker(): Promise<Worker>;
}
