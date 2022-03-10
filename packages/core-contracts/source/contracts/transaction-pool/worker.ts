// import { IpcSubprocess } from "../../utils/ipc-subprocess";
import { ITransaction, ITransactionData } from "../crypto";

export type SerializedTransaction = {
	id: string;
	serialized: string;
};

export interface WorkerScriptHandler {
	setConfig(networkConfig: any): void;
	setHeight(height: number): void;
	getTransactionFromData(transactionData: ITransactionData | string): Promise<SerializedTransaction>;
}

// export type WorkerIpcSubprocess = IpcSubprocess<WorkerScriptHandler>;
export type WorkerIpcSubprocess = any;

export type WorkerIpcSubprocessFactory = () => WorkerIpcSubprocess;

export interface Worker {
	getQueueSize(): number;
	getTransactionFromData(transactionData: ITransactionData | Buffer): Promise<ITransaction>;
}

export type WorkerFactory = () => Worker;

export interface WorkerPool {
	getTransactionFromData(transactionData: ITransactionData | Buffer): Promise<ITransaction>;
}
