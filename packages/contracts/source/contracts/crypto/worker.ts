// import { Requests } from "../kernel/ipc.js";
// import { Subprocess } from "../ipc/sub-process.js";
// import { KeyValuePair } from "../types/index.js";

// export interface WorkerFlags extends KeyValuePair {
// 	workerLoggingEnabled: boolean;
// }

// export interface WorkerScriptHandler {
// 	boot(flags: WorkerFlags): Promise<void>;
// 	consensusSignature<K extends Requests<Contracts.Crypto.Signature>>(
// 		method: K,
// 		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
// 	): Promise<ReturnType<Contracts.Crypto.Signature[K]>>;
// 	walletSignature<K extends Requests<Contracts.Crypto.Signature>>(
// 		method: K,
// 		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
// 	): Promise<ReturnType<Contracts.Crypto.Signature[K]>>;
// 	blockFactory<K extends Requests<Contracts.Crypto.BlockFactory>>(
// 		method: K,
// 		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
// 	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>>;
// 	transactionFactory<K extends Requests<Contracts.Crypto.TransactionFactory>>(
// 		method: K,
// 		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
// 	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>>;
// 	publicKeyFactory<K extends Requests<Contracts.Crypto.PublicKeyFactory>>(
// 		method: K,
// 		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
// 	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>>;
// }

// export type WorkerFactory = () => Worker;

// export type WorkerSubprocess = Subprocess<WorkerScriptHandler>;

// export type WorkerSubprocessFactory = () => WorkerSubprocess;

// export interface Worker extends WorkerScriptHandler {
// 	getQueueSize(): number;
// 	kill(): Promise<number>;
// }

// export interface WorkerPool {
// 	boot(): Promise<void>;
// 	shutdown(): Promise<void>;
// 	getWorker(): Promise<Worker>;
// }
