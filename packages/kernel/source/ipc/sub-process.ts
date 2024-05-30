import { Worker } from "worker_threads";

import { Requests } from "./handler.js";

export type SuccessReply = {
	id: number;
	result: any;
};

export type ErrorReply = {
	id: number;
	error: string;
};

export type Reply = SuccessReply | ErrorReply;

export type RequestCallback<T extends {}, K extends Requests<T>> = {
	// @ts-ignore
	resolve: (result: ReturnType<T[K]>) => void;
	reject: (error: Error) => void;
};

export type RequestCallbacks<T extends {}> = RequestCallback<T, Requests<T>>;

export class Subprocess<T extends {}> {
	private lastId = 1;
	private readonly subprocess: Worker;
	private readonly callbacks = new Map<number, RequestCallbacks<T>>();

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
	public sendAction(method: string, ...arguments_: any): void {
		// TODO: we have to make sure args are always serializable
		this.subprocess.postMessage({ args: arguments_, method });
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

	private onSubprocessMessage(message: Reply): void {
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
