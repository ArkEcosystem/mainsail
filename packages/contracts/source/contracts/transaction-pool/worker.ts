import { CommitHandler } from "../crypto/index.js";
import { EventListener } from "../kernel/index.js";
import { EventCallback, Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	getTransactions(): Promise<string[]>;
	commit(height: number, transactions: {transaction: string, gasUsed: number}[]): Promise<void>;
	setPeer(ip: string): Promise<void>;
	forgetPeer(ip: string): Promise<void>;
	start(): Promise<void>;
	reloadWebhooks(): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends Omit<WorkerScriptHandler, "commit" | "getTransactions">, CommitHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
	getTransactionBytes(): Promise<Buffer[]>;
	registerEventHandler(event: string, callback: EventCallback<any>): void;
}
