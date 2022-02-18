import { Interfaces } from "@arkecosystem/crypto";

import { IpcSubprocess } from "../../utils/ipc-subprocess";

export type SerializedTransaction = {
	id: string;
	serialized: string;
	isVerified: boolean;
};

export interface WorkerScriptHandler {
	setConfig(networkConfig: any): void;
	setHeight(height: number): void;
	getTransactionFromData(transactionData: Interfaces.ITransactionData | string): Promise<SerializedTransaction>;
}

export type WorkerIpcSubprocess = IpcSubprocess<WorkerScriptHandler>;

export type WorkerIpcSubprocessFactory = () => WorkerIpcSubprocess;

export interface Worker {
	getQueueSize(): number;
	getTransactionFromData(transactionData: Interfaces.ITransactionData | Buffer): Promise<Interfaces.ITransaction>;
}

export type WorkerFactory = () => Worker;

export interface WorkerPool {
	getTransactionFromData(transactionData: Interfaces.ITransactionData | Buffer): Promise<Interfaces.ITransaction>;
}
