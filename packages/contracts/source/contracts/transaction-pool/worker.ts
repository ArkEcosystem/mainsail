import type { CommitHandler } from "../crypto/index.js";
import type { EventListener } from "../kernel/index.js";
import type { EventCallback } from "../kernel/ipc.js";
import type { KeyValuePair } from "../types/index.js";
import type { GetBatchResult, GetBatchOptions } from "./selector.js";

export type WorkerFlags = KeyValuePair;

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	getTransactions(options: GetBatchOptions): Promise<GetBatchResult>;
	removeTransaction(address: string, id: string): Promise<void>;
	commit(height: number, sendersAddresses: string[], consumedGas: number, isSyncing: boolean): Promise<void>;
	setPeer(ip: string): Promise<void>;
	forgetPeer(ip: string): Promise<void>;
	start(height: number): Promise<void>;
	reloadWebhooks(): Promise<void>;
}

export type WorkerFactory = () => Worker;

export interface Worker extends Omit<WorkerScriptHandler, "commit">, CommitHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
	registerEventHandler<T>(event: string, callback: EventCallback<T>): void;
}
