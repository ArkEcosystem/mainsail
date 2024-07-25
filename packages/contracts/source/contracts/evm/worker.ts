import { EventListener } from "../kernel/index.js";
import { Subprocess } from "../kernel/ipc.js";
import { StoreChange } from "../state/index.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	setPeerCount(peerCount: number): Promise<void>;
	importSnapshot(height: number): Promise<void>;
	commit(data: { block: string; store: StoreChange }): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends WorkerScriptHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
}
