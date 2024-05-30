import { inject, injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
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

	public async kill(): Promise<number> {
		return this.ipcSubprocess.kill();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}
}
