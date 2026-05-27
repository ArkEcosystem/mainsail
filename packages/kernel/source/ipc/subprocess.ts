import type { Contracts } from "@mainsail/contracts";
import type { Worker } from "worker_threads";

import { Identifiers, LogLevels } from "@mainsail/constants";
import split from "split2";

export class Subprocess implements Contracts.Kernel.IPC.Subprocess {
	#logLevels = new Set(LogLevels);

	private lastId = 1;
	private readonly subprocess: Worker;
	private readonly callbacks = new Map<number, Contracts.Kernel.IPC.RequestCallback<unknown>>();
	private readonly eventHandlers = new Map<string, Contracts.Kernel.IPC.EventCallback<string>>();

	public constructor(
		app: Contracts.Kernel.Application,
		name: string,
		loggerContext: Contracts.Kernel.LoggerContext,
		subprocess: Worker,
	) {
		this.subprocess = subprocess;

		const logger = app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service);

		// Capture the thread id up front: Node resets it to -1 once the worker exits.
		const workerName = `${name}-${this.subprocess.threadId}`;
		logger.debug(`Spawning worker ${workerName}`);

		this.subprocess.on("message", this.onMessage.bind(this));
		this.subprocess.on("error", (error: Error) => {
			logger.error(`Worker ${workerName} error: ${error.message}`);
			this.rejectPending(error);
		});
		this.subprocess.on("exit", (code) => {
			logger.debug(`Worker ${workerName} stopped with exit code ${code}`);
			this.rejectPending(new Error(`Worker ${workerName} stopped with exit code ${code}`));
		});
		// A reply that fails to deserialize cannot be matched back to its request id,
		// so the pending callback can never be settled. Reject everything in flight to
		// avoid a silent hang rather than leaking the stuck request.
		this.subprocess.on("messageerror", (error: Error) => {
			logger.error(`Worker ${workerName} message could not be deserialized: ${error.message}`);
			this.rejectPending(error);
		});


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
			if (this.#logLevels.has(level)) {
				logger[level](message, loggerContext);
			} else {
				logger.warn(`[unknown:${level}] ${message}`);
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

	public sendRequest<T>(method: string, ...arguments_: unknown[]): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const id = this.lastId++;
			// The callbacks map is heterogeneous (one entry per in-flight request, each with its
			// own result type), so it stores `unknown`; this is the boundary where the request's
			// `T` is erased. `sendRequest<T>` keeps the promise typed for the caller.
			this.callbacks.set(id, { reject, resolve: resolve as (result: unknown) => void });
			this.subprocess.postMessage({ args: arguments_, id, method });
		});
	}

	public registerEventHandler<T>(event: string, callback: Contracts.Kernel.IPC.EventCallback<T>): void {
		this.eventHandlers.set(event, callback as Contracts.Kernel.IPC.EventCallback<unknown>);
	}

	private rejectPending(error: Error): void {
		for (const { reject } of this.callbacks.values()) {
			reject(error);
		}
		this.callbacks.clear();
	}

	private onMessage(message: Contracts.Kernel.IPC.Reply<unknown> | Contracts.Kernel.IPC.Event): void {
		if ("id" in message) {
			try {
				if ("error" in message) {
					this.callbacks.get(message.id)?.reject(new Error(message.error));
				} else {
					this.callbacks.get(message.id)?.resolve(message.result);
				}
			} finally {
				this.callbacks.delete(message.id);
			}

			return;
		}

		if ("event" in message) {
			this.eventHandlers.get(message.event)?.(message.data);
		}
	}
}
