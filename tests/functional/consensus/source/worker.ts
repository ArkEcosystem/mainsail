import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Ipc, IpcWorker } from "@mainsail/kernel";

@injectable()
export class Worker implements IpcWorker.WorkerScriptHandler {
	public async boot(flags: IpcWorker.WorkerFlags): Promise<void> {
		//
	}

	public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		throw new Error("Method consensusSignature not implemented.");
	}

	public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		throw new Error("Method walletSignature not implemented.");
	}

	public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		throw new Error("Method blockFactory not implemented.");
	}

	public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		throw new Error("Method transactionFactory not implemented.");
	}

	public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		throw new Error("Method publicKeyFactory not implemented.");
	}

	public async getQueueSize(): Promise<number> {
		return 0;
	}

	public async kill(signal?: number | NodeJS.Signals): Promise<boolean> {
		return true;
	}
}
