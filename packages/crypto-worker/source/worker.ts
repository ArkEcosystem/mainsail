import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Ipc, IpcWorker, Utils } from "@mainsail/kernel";

@injectable()
export class Worker implements IpcWorker.Worker {
	@inject(Identifiers.CryptoWorker.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: IpcWorker.WorkerSubprocessFactory;

	private ipcSubprocess!: Ipc.Subprocess<IpcWorker.WorkerScriptHandler>;

	#booted = false;
	#booting = false;

	public async boot(flags: IpcWorker.WorkerFlags): Promise<void> {
		this.ipcSubprocess = this.createWorkerSubprocess();

		while (this.#booting) {
			await Utils.sleep(50);
		}

		if (this.#booted) {
			return;
		}

		this.#booting = true;

		await this.ipcSubprocess.sendRequest("boot", flags);

		this.#booting = false;
		this.#booted = true;
	}

	public async kill(signal?: number | NodeJS.Signals): Promise<boolean> {
		return this.ipcSubprocess.kill(signal);
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.ipcSubprocess.sendRequest("consensusSignature", method, arguments_);
	}

	public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.ipcSubprocess.sendRequest("walletSignature", method, arguments_);
	}

	public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.ipcSubprocess.sendRequest("blockFactory", method, arguments_);
	}

	public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.ipcSubprocess.sendRequest("transactionFactory", method, arguments_);
	}

	public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.ipcSubprocess.sendRequest("publicKeyFactory", method, arguments_);
	}
}
