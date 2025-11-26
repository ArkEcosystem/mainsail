import { Identifiers, LogLevels } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import split from "split2";
import type { Worker } from "worker_threads";

export class Subprocess<T extends Record<string, unknown> = Record<string, unknown>>
	implements Contracts.Kernel.IPC.Subprocess<T>
{
	#logLevels = new Set(LogLevels);

	private lastId = 1;
	private readonly subprocess: Worker;
	private readonly callbacks = new Map<number, Contracts.Kernel.IPC.RequestCallbacks<T>>();
	private readonly eventHandlers = new Map<string, Contracts.Kernel.IPC.EventCallback<string>>();

	public constructor(
		app: Contracts.Kernel.Application,
		loggerContext: Contracts.Kernel.LoggerContext,
		subprocess: Worker,
	) {
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

	// TODO: use type magic to infer args (didn't work when T is also using same signatures)
	public sendRequest<T>(method: string, ...arguments_: unknown[]): Promise<T> {
		return new Promise((resolve, reject) => {
			const id = this.lastId++;
			this.callbacks.set(id, { reject, resolve } as unknown as Contracts.Kernel.IPC.RequestCallback);
			// TODO: we have to make sure args are always serializable and ideally don't copy
			this.subprocess.postMessage({ args: arguments_, id, method });
		});
	}

	public registerEventHandler<T>(event: string, callback: Contracts.Kernel.IPC.EventCallback<T>): void {
		this.eventHandlers.set(event, callback as Contracts.Kernel.IPC.EventCallback<unknown>);
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

	private onSubprocessMessage(message: Contracts.Kernel.IPC.Reply<void>): void {
		if (!("id" in message)) {
			return;
		}

		try {
			if ("error" in message) {
				this.callbacks.get(message.id)?.reject(new Error(message.error));
			} else {
				this.callbacks.get(message.id)?.resolve(message.result as unknown as T);
			}
		} finally {
			this.callbacks.delete(message.id);
		}
	}
}
