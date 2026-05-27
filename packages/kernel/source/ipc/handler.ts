import type { Contracts } from "@mainsail/contracts";

import { parentPort } from "worker_threads";

export class Handler<T extends object> implements Contracts.Kernel.IPC.Handler<T> {
	private readonly handler: T;

	public constructor(handler: T) {
		this.handler = handler;

		this.handleRequest();
	}

	public handleRequest(): void {
		parentPort?.on("message", (message) => {
			void this.#onMessage(message);
		});
	}

	async #onMessage(message: { method: string; id: string; args: [] }) {
		try {
			if (this.handler[message.method] === undefined) {
				throw new Error(`Method ${message.method} is not defined on the handler`);
			}

			const result = await this.handler[message.method](...message.args);
			parentPort?.postMessage({ id: message.id, result });
		} catch (error) {
			parentPort?.postMessage({ error: error.message, id: message.id });
		}
	}
}
