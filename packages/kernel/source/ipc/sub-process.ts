import { Contracts, Identifiers } from "@mainsail/contracts";
import split from "split2";
import { Worker } from "worker_threads";

export class Subprocess<T extends Record<string, any>> implements Contracts.Kernel.IPC.Subprocess<T> {
	private lastId = 1;
	private readonly subprocess: Worker;
	private readonly callbacks = new Map<number, Contracts.Kernel.IPC.RequestCallbacks<T>>();
	private readonly eventHandlers = new Map<string, Contracts.Kernel.IPC.EventCallback<any>>();

	public constructor(app: Contracts.Kernel.Application, subprocess: Worker) {
		this.subprocess = subprocess;
		this.subprocess.on("message", this.onSubprocessMessage.bind(this));
		this.subprocess.on("message", this.onEmit.bind(this));

		const logger = app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service);

		this.subprocess.stdout.pipe(split()).on("data", (line) => {
			// [LEVEL] MESSAGE
			const match = line.match(/^\[(\w+)]\s+(.*)$/);
			if (!match) {
				// Fallback to normal console.log if output doesn't match expected format.
				// For example, this is the case when worker uses `console.log` directly instead of logger service.
				console.log(line);
				return;
			}

			const [, level, message] = match;
			if (logger.isValidLevel(level)) {
				logger[level](message);
			} else {
				logger.warning(`[unknown:${level}] ${message}`);
			}
		});

		this.subprocess.stderr.pipe(split()).on("data", (line) => {
			logger.error(line);
		});
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

	public registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback<any>): void {
		this.eventHandlers.set(event, callback);
	}

	private onEmit(message: Contracts.Kernel.IPC.Event): void {
		if (!("event" in message)) {
			return;
		}

		const callback = this.eventHandlers.get(message.event);

		if (callback) {
			callback(message.data);
		}
	}

	private onSubprocessMessage(message: Contracts.Kernel.IPC.Reply): void {
		if (!("id" in message)) {
			return;
		}

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
