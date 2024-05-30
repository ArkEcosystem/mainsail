import { BlockFactory, PublicKeyFactory, Signature, TransactionFactory } from "../crypto/index.js";
import { Requests, Subprocess } from "../kernel/ipc.js";
import { KeyValuePair } from "../types/index.js";

export interface WorkerFlags extends KeyValuePair {
	workerLoggingEnabled: boolean;
}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	consensusSignature<K extends Requests<Signature>>(
		method: K,
		...arguments_: Parameters<Signature[K]>
	): Promise<ReturnType<Signature[K]>>;
	walletSignature<K extends Requests<Signature>>(
		method: K,
		...arguments_: Parameters<Signature[K]>
	): Promise<ReturnType<Signature[K]>>;
	blockFactory<K extends Requests<BlockFactory>>(
		method: K,
		...arguments_: Parameters<BlockFactory[K]>
	): Promise<ReturnType<BlockFactory[K]>>;
	transactionFactory<K extends Requests<TransactionFactory>>(
		method: K,
		...arguments_: Parameters<TransactionFactory[K]>
	): Promise<ReturnType<TransactionFactory[K]>>;
	publicKeyFactory<K extends Requests<PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<PublicKeyFactory[K]>
	): Promise<ReturnType<PublicKeyFactory[K]>>;
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
