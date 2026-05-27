import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Worker implements Contracts.Crypto.Worker {
	@inject(Identifiers.CryptoWorker.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	private ipcSubprocess!: Contracts.Crypto.WorkerSubprocess;

	#bootPromise?: Promise<void>;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		if (!this.#bootPromise) {
			this.ipcSubprocess = this.createWorkerSubprocess();
			this.#bootPromise = this.ipcSubprocess.sendRequest("boot", flags);
		}

		await this.#bootPromise;
	}

	public async kill(): Promise<number> {
		return this.ipcSubprocess.kill();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	public async consensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureBls[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.ipcSubprocess.sendRequest("consensusSignature", method, arguments_) as Promise<
			ReturnType<Contracts.Crypto.SignatureBls[K]>
		>;
	}

	public async walletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureEcdsa>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureEcdsa[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>> {
		return this.ipcSubprocess.sendRequest("walletSignature", method, arguments_) as Promise<
			ReturnType<Contracts.Crypto.SignatureEcdsa[K]>
		>;
	}

	public async blockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.ipcSubprocess.sendRequest("blockFactory", method, arguments_) as Promise<
			ReturnType<Contracts.Crypto.BlockFactory[K]>
		>;
	}

	public async transactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.ipcSubprocess.sendRequest("transactionFactory", method, arguments_) as Promise<
			ReturnType<Contracts.Crypto.TransactionFactory[K]>
		>;
	}

	public async publicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.ipcSubprocess.sendRequest("publicKeyFactory", method, arguments_) as Promise<
			ReturnType<Contracts.Crypto.PublicKeyFactory[K]>
		>;
	}
}
