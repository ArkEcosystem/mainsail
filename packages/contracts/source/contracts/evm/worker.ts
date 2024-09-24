import { CommitHandler } from "../crypto/index.js";
import { EventListener } from "../kernel/index.js";
import { Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	setPeerCount(peerCount: number): Promise<void>;
	commit(data: { block: string }): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends WorkerScriptHandler, CommitHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
}
