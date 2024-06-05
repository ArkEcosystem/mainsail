import { Contracts } from "@mainsail/contracts";
import { Worker } from "worker_threads";

export class Subprocess<T extends {}> implements Contracts.Kernel.IPC.Subprocess<T> {
	private lastId = 1;
	private readonly subprocess: Worker;
	private readonly callbacks = new Map<number, Contracts.Kernel.IPC.RequestCallbacks<T>>();

	public constructor(subprocess: Worker) {
		this.subprocess = subprocess;
		this.subprocess.on("message", this.onSubprocessMessage.bind(this));
	}

	public async kill(): Promise<number> {
		return this.subprocess.terminate();
	}

	public getQueueSize(): number {
		return this.callbacks.size;
	}

	// TODO: use type magic to infer args (didn't work when T is also using same signatures)
	public sendRequest(method: string, ...arguments_: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const id = this.lastId++;
			this.callbacks.set(id, { reject, resolve });
			// TODO: we have to make sure args are always serializable and ideally don't copy
			this.subprocess.postMessage({ args: arguments_, id, method });
		});
	}

	private onSubprocessMessage(message: Contracts.Kernel.IPC.Reply): void {
		try {
			if ("error" in message) {
				this.callbacks.get(message.id)?.reject(new Error(message.error));
			} else {
				this.callbacks.get(message.id)?.resolve(message.result);
			}
		} finally {
			this.callbacks.delete(message.id);
		}
	}
}
