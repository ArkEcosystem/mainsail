import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
// @ts-ignore
export class Worker implements Contracts.Crypto.Worker {
	@inject(Identifiers.CryptoWorker.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	private ipcSubprocess!: Contracts.Crypto.WorkerSubprocess;

	#booted = false;
	#booting = false;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
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
