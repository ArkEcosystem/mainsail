import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";

@injectable()
export class Worker implements Contracts.Crypto.Worker {
	@inject(Identifiers.CryptoWorker.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Kernel.IPC.SubprocessFactory;

	private ipcSubprocess!: Contracts.Kernel.IPC.Subprocess;

	#bootPromise?: Promise<void>;
	#disposePromise?: Promise<void>;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();
	}

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		if (!this.#bootPromise) {
			this.#bootPromise = this.ipcSubprocess.sendRequest("boot", flags);
		}

		await this.#bootPromise;
	}

	public async dispose(): Promise<void> {
		if (!this.#disposePromise) {
			this.#disposePromise = this.ipcSubprocess.sendRequest("dispose");
		}

		await this.#disposePromise;
	}

	public async kill(): Promise<number> {
		return this.ipcSubprocess.kill();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	public isStopped(): boolean {
		return this.ipcSubprocess.isStopped();
	}

	public async consensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureBls[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.ipcSubprocess.sendRequest<ReturnType<Contracts.Crypto.SignatureBls[K]>>(
			"consensusSignature",
			method,
			arguments_,
		);
	}

	public async walletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureEcdsa>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.SignatureEcdsa[K]>
	): Promise<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>> {
		return this.ipcSubprocess.sendRequest<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>>(
			"walletSignature",
			method,
			arguments_,
		);
	}

	public async blockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.ipcSubprocess.sendRequest<ReturnType<Contracts.Crypto.BlockFactory[K]>>(
			"blockFactory",
			method,
			arguments_,
		);
	}

	public async transactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.ipcSubprocess.sendRequest<ReturnType<Contracts.Crypto.TransactionFactory[K]>>(
			"transactionFactory",
			method,
			arguments_,
		);
	}

	public async publicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.ipcSubprocess.sendRequest<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>>(
			"publicKeyFactory",
			method,
			arguments_,
		);
	}
}
