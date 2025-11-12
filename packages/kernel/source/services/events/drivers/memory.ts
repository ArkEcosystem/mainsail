import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import mm from "nanomatch";

class OnceListener implements Contracts.Kernel.EventListener {
	public constructor(
		private readonly dispatcher: Contracts.Kernel.EventDispatcher,
		private readonly listener: Contracts.Kernel.EventListener,
	) {}

	public async handle({ name }): Promise<void> {
		this.dispatcher.forget(name, this.listener);
	}
}

@injectable()
export class MemoryEventDispatcher implements Contracts.Kernel.EventDispatcher {
	readonly #listeners: Map<string, Set<Contracts.Kernel.EventListener>> = new Map<
		string,
		Set<Contracts.Kernel.EventListener>
	>();

	public listen(event: string, listener: Contracts.Kernel.EventListener): () => void {
		this.#getListenersByEvent(event).add(listener);

		return this.forget.bind(this, event, listener);
	}

	public listenMany(events: Array<[string, Contracts.Kernel.EventListener]>): Map<string, () => void> {
		const listeners: Map<string, () => void> = new Map<string, () => void>();

		for (const [event, listener] of events) {
			listeners.set(event, this.listen(event, listener));
		}

		return listeners;
	}

	public listenOnce(name: string, listener: Contracts.Kernel.EventListener): void {
		this.listen(name, listener);

		this.listen(name, new OnceListener(this, listener));
	}

	public forget(event: string, listener?: Contracts.Kernel.EventListener): boolean {
		if (event && listener) {
			return this.#getListenersByEvent(event).delete(listener);
		}

		return this.#listeners.delete(event);
	}

	public forgetMany(events: string[] | Array<[string, Contracts.Kernel.EventListener]>): void {
		for (const event of events) {
			if (Array.isArray(event)) {
				this.forget(event[0], event[1]);
			} else {
				this.forget(event);
			}
		}
	}

	public flush(): void {
		this.#listeners.clear();
	}

	public getListeners(event?: string): Contracts.Kernel.EventListener[] {
		return [...this.#getListenersByPattern(event || "*").values()];
	}

	public hasListeners(event: string): boolean {
		return this.#getListenersByPattern(event).length > 0;
	}

	public countListeners(event?: string): number {
		if (event) {
			return this.#getListenersByPattern(event).length;
		}

		let totalCount = 0;
		for (const values of this.#listeners.values()) {
			totalCount += values.size;
		}

		return totalCount;
	}

	public async dispatch<T = any>(event: string, data?: T): Promise<void> {
		await Promise.resolve();

		const resolvers: Array<Promise<void>> = [];

		for (const listener of this.#getListenersByPattern(event)) {
			resolvers.push(new Promise((resolve) => resolve(listener.handle({ data, name: event }))));
		}

		await Promise.all(resolvers);
	}

	public async dispatchSeq<T = any>(event: string, data?: T): Promise<void> {
		await Promise.resolve();

		for (const listener of this.#getListenersByPattern(event)) {
			await listener.handle({ data, name: event });
		}
	}

	public dispatchSync<T = any>(event: string, data?: T): void {
		for (const listener of this.#getListenersByPattern(event)) {
			listener.handle({ data, name: event });
		}
	}

	public async dispatchMany<T = any>(events: Array<[string, T]>): Promise<void> {
		await Promise.all(Object.values(events).map((value: [string, T]) => this.dispatch(value[0], value[1])));
	}

	public async dispatchManySeq<T = any>(events: Array<[string, T]>): Promise<void> {
		for (const value of Object.values(events)) {
			await this.dispatchSeq(value[0], value[1]);
		}
	}

	public dispatchManySync<T = any>(events: Array<[string, T]>): void {
		for (const value of Object.values(events)) {
			this.dispatchSync(value[0], value[1]);
		}
	}

	#getListenersByEvent(name: string): Set<Contracts.Kernel.EventListener> {
		if (!this.#listeners.has(name)) {
			this.#listeners.set(name, new Set<Contracts.Kernel.EventListener>());
		}

		const listener: Set<Contracts.Kernel.EventListener> | undefined = this.#listeners.get(name);

		assert.defined(listener);

		return listener;
	}

	#getListenersByPattern(event: string): Contracts.Kernel.EventListener[] {
		// @ts-ignore
		const matches: string[] = mm([...this.#listeners.keys()], event);

		let eventListeners: Contracts.Kernel.EventListener[] = [];
		if (this.#listeners.has("*")) {
			eventListeners = [...eventListeners, ...this.#getListenersByEvent("*")];
		}

		for (const match of matches) {
			const matchListeners: Set<Contracts.Kernel.EventListener> | undefined = this.#getListenersByEvent(match);

			if (matchListeners && matchListeners.size > 0) {
				eventListeners = [...eventListeners, ...matchListeners];
			}
		}

		return eventListeners;
	}
}
