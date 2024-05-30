import { Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {
	workerLoggingEnabled: boolean;
}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends WorkerScriptHandler {
	getQueueSize(): number;
	kill(): Promise<number>;
}

export interface WorkerPool {
	boot(): Promise<void>;
	shutdown(): Promise<void>;
	getWorker(): Promise<Worker>;
}
