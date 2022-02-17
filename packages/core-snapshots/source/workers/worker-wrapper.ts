import { EventEmitter } from "events";
import { Worker } from "worker_threads";

import { WorkerData, WorkerSyncData } from "../contracts/worker";

export class WorkerWrapper extends EventEmitter {
	private worker: Worker;
	private isDone = false;

	public constructor(data: WorkerData) {
		super();
		this.worker = new Worker(__dirname + "/worker.js", { workerData: data });

		this.worker.on("message", (data) => {
			this.handleMessage(data);
		});

		this.worker.on("error", (err) => {
			this.emit("*", { data: err, name: "error" });
		});

		this.worker.on("exit", (statusCode) => {
			this.isDone = true;
			this.emit("exit", statusCode);
			this.emit("*", { data: statusCode, name: "exit" });
		});
	}

	public start(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.once("*", (data) => {
				switch (data.name) {
					case "started": {
						resolve();

						break;
					}
					case "exit": {
						resolve();

						break;
					}
					case "exception":
					case "error": {
						reject(data.data);

						break;
					}
					default: {
						reject();
					}
				}
			});

			this.worker.postMessage({ action: "start" });
		});
	}

	public sync(data: WorkerSyncData): Promise<any> {
		return new Promise<void>((resolve, reject) => {
			if (this.isDone) {
				resolve();
				return;
			}

			this.once("*", (data) => {
				switch (data.name) {
					case "synchronized": {
						resolve(data.data);

						break;
					}
					case "exit": {
						resolve();

						break;
					}
					case "exception":
					case "error": {
						reject(data.data);

						break;
					}
					default: {
						reject();
					}
				}
			});

			this.worker.postMessage({
				action: "sync",
				data: data,
			});
		});
	}

	public async terminate(): Promise<void> {
		await this.worker.terminate();
	}

	private handleMessage(data) {
		// Actions: count, started, synced, exit, error
		this.emit(data.action, data.data);
		/* istanbul ignore next */
		if (data.action !== "count" && data.action !== "log") {
			this.emit("*", { data: data.data, name: data.action });
		}
	}
}
