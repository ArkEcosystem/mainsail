import type { CommitHandler } from "../crypto/index.js";
import type { EventListener } from "../kernel/index.js";
import type { Subprocess } from "../kernel/ipc.js";
import type { KeyValuePair } from "../types/index.js";

export type WorkerFlags = KeyValuePair;

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	setPeerCount(peerCount: number): Promise<void>;
	commit(blockNumber: number): Promise<void>;
	start(blockNumber: number): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends Omit<WorkerScriptHandler, "commit">, CommitHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
}
