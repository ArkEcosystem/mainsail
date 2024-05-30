import { Contracts } from "@mainsail/contracts";
import { parentPort } from "worker_threads";

export class Handler<T extends {}> implements Contracts.Kernel.IPC.Handler<T> {
	private readonly handler: T;

	public constructor(handler: T) {
		this.handler = handler;
	}

	public handleAction<K extends Contracts.Kernel.IPC.Actions<T>>(method: K): void {
		parentPort?.on("message", (message) => {
			if (message.method === method) {
				// @ts-ignore
				this.handler[method](...message.args);
			}
		});
	}

	public handleRequest<K extends Contracts.Kernel.IPC.Requests<T>>(method: K): void {
		parentPort?.on("message", async (message) => {
			if (message.method === method) {
				try {
					// @ts-ignore
					const result = await this.handler[method](...message.args);
					parentPort?.postMessage({ id: message.id, result });
				} catch (error) {
					parentPort?.postMessage({ error: error.message, id: message.id });
				}
			}
		});
	}
}
