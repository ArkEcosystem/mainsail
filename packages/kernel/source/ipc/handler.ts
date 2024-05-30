import { parentPort } from "worker_threads";

export type Actions<T extends {}> = {
	[K in keyof T]: T[K] extends (...arguments_: any[]) => any ? (ReturnType<T[K]> extends void ? K : never) : never;
}[keyof T];

export type Requests<T extends {}> = {
	[K in keyof T]: T[K] extends (...arguments_: any[]) => any
		? ReturnType<T[K]> extends Promise<any>
			? K
			: never
		: never;
}[keyof T];

export class Handler<T extends {}> {
	private readonly handler: T;

	public constructor(handler: T) {
		this.handler = handler;
	}

	public handleAction<K extends Actions<T>>(method: K): void {
		parentPort?.on("message", (message) => {
			if (message.method === method) {
				// @ts-ignore
				this.handler[method](...message.args);
			}
		});
	}

	public handleRequest<K extends Requests<T>>(method: K): void {
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
