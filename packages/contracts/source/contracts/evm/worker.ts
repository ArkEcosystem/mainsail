import { CommitHandler } from "../crypto/index.js";
import { EventListener } from "../kernel/index.js";
import { Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	setPeerCount(peerCount: number): Promise<void>;
	commit(height: number): Promise<void>;
}

export type WorkerFactory = () => Worker;

export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

export type WorkerSubprocessFactory = () => WorkerSubprocess;

export interface Worker extends Omit<WorkerScriptHandler, "commit">, CommitHandler, EventListener {
	getQueueSize(): number;
	kill(): Promise<number>;
}
