import type { BlockFactory } from "../crypto/block.js";
import type { PublicKeyFactory, SignatureBls, SignatureEcdsa } from "../crypto/identities.js";
import type { TransactionFactory } from "../crypto/transactions.js";
import type { MethodArguments, Requests } from "../kernel/ipc.js";
import type { JsonObject } from "../types/index.js";

export interface WorkerFlags extends JsonObject {
	workerLoggingEnabled: boolean;
}

export interface WorkerScriptHandler {
	boot(flags: WorkerFlags): Promise<void>;
	consensusSignature<K extends Requests<SignatureBls>>(
		method: K,
		arguments_: MethodArguments<SignatureBls, K>,
	): Promise<ReturnType<SignatureBls[K]>>;
	walletSignature<K extends Requests<SignatureEcdsa>>(
		method: K,
		arguments_: MethodArguments<SignatureEcdsa, K>,
	): Promise<ReturnType<SignatureEcdsa[K]>>;
	blockFactory<K extends Requests<BlockFactory>>(
		method: K,
		arguments_: MethodArguments<BlockFactory, K>,
	): Promise<ReturnType<BlockFactory[K]>>;
	transactionFactory<K extends Requests<TransactionFactory>>(
		method: K,
		arguments_: MethodArguments<TransactionFactory, K>,
	): Promise<ReturnType<TransactionFactory[K]>>;
	publicKeyFactory<K extends Requests<PublicKeyFactory>>(
		method: K,
		arguments_: MethodArguments<PublicKeyFactory, K>,
	): Promise<ReturnType<PublicKeyFactory[K]>>;
}

export type WorkerFactory = () => Worker;

export interface Worker {
	boot(flags: WorkerFlags): Promise<void>;
	getQueueSize(): number;
	isStopped(): boolean;
	kill(): Promise<number>;
	consensusSignature<K extends Requests<SignatureBls>>(
		method: K,
		...arguments_: Parameters<SignatureBls[K]>
	): Promise<ReturnType<SignatureBls[K]>>;
	walletSignature<K extends Requests<SignatureEcdsa>>(
		method: K,
		...arguments_: Parameters<SignatureEcdsa[K]>
	): Promise<ReturnType<SignatureEcdsa[K]>>;
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

export interface WorkerPool {
	boot(): Promise<void>;
	shutdown(): Promise<void>;
	getWorker(): Worker;
}
