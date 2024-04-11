import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import mm from "nanomatch";

import { assert } from "../../../utils/assert.js";

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
	readonly #listeners: Map<Contracts.Kernel.EventName, Set<Contracts.Kernel.EventListener>> = new Map<
		Contracts.Kernel.EventName,
		Set<Contracts.Kernel.EventListener>
	>();

	public listen(event: Contracts.Kernel.EventName, listener: Contracts.Kernel.EventListener): () => void {
		this.#getListenersByEvent(event).add(listener);

		return this.forget.bind(this, event, listener);
	}

	public listenMany(
		events: Array<[Contracts.Kernel.EventName, Contracts.Kernel.EventListener]>,
	): Map<Contracts.Kernel.EventName, () => void> {
		const listeners: Map<Contracts.Kernel.EventName, () => void> = new Map<
			Contracts.Kernel.EventName,
			() => void
		>();

		for (const [event, listener] of events) {
			listeners.set(event, this.listen(event, listener));
		}

		return listeners;
	}

	public listenOnce(name: Contracts.Kernel.EventName, listener: Contracts.Kernel.EventListener): void {
		this.listen(name, listener);

		this.listen(name, new OnceListener(this, listener));
	}

	public forget(event: Contracts.Kernel.EventName, listener?: Contracts.Kernel.EventListener): boolean {
		if (event && listener) {
			return this.#getListenersByEvent(event).delete(listener);
		}

		return this.#listeners.delete(event);
	}

	public forgetMany(
		events: Contracts.Kernel.EventName[] | Array<[Contracts.Kernel.EventName, Contracts.Kernel.EventListener]>,
	): void {
		for (const event of events) {
			Array.isArray(event) ? this.forget(event[0], event[1]) : this.forget(event);
		}
	}

	public flush(): void {
		this.#listeners.clear();
	}

	public getListeners(event?: Contracts.Kernel.EventName): Contracts.Kernel.EventListener[] {
		return [...this.#getListenersByPattern(event || "*").values()];
	}

	public hasListeners(event: Contracts.Kernel.EventName): boolean {
		return this.#getListenersByPattern(event).length > 0;
	}

	public countListeners(event?: Contracts.Kernel.EventName): number {
		if (event) {
			return this.#getListenersByPattern(event).length;
		}

		let totalCount = 0;
		for (const values of this.#listeners.values()) {
			totalCount += values.size;
		}

		return totalCount;
	}

	public async dispatch<T = any>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		await Promise.resolve();

		const resolvers: Array<Promise<void>> = [];

		for (const listener of this.#getListenersByPattern(event)) {
			resolvers.push(new Promise((resolve) => resolve(listener.handle({ data, name: event }))));
		}

		await Promise.all(resolvers);
	}

	public async dispatchSeq<T = any>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		await Promise.resolve();

		for (const listener of this.#getListenersByPattern(event)) {
			await listener.handle({ data, name: event });
		}
	}

	public dispatchSync<T = any>(event: Contracts.Kernel.EventName, data?: T): void {
		for (const listener of this.#getListenersByPattern(event)) {
			listener.handle({ data, name: event });
		}
	}

	public async dispatchMany<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): Promise<void> {
		await Promise.all(
			Object.values(events).map((value: [Contracts.Kernel.EventName, T]) => this.dispatch(value[0], value[1])),
		);
	}

	public async dispatchManySeq<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): Promise<void> {
		for (const value of Object.values(events)) {
			await this.dispatchSeq(value[0], value[1]);
		}
	}

	public dispatchManySync<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): void {
		for (const value of Object.values(events)) {
			this.dispatchSync(value[0], value[1]);
		}
	}

	#getListenersByEvent(name: Contracts.Kernel.EventName): Set<Contracts.Kernel.EventListener> {
		if (!this.#listeners.has(name)) {
			this.#listeners.set(name, new Set<Contracts.Kernel.EventListener>());
		}

		const listener: Set<Contracts.Kernel.EventListener> | undefined = this.#listeners.get(name);

		assert.defined<Set<Contracts.Kernel.EventListener>>(listener);

		return listener;
	}

	#getListenersByPattern(event: Contracts.Kernel.EventName): Contracts.Kernel.EventListener[] {
		// @ts-ignore
		const matches: Contracts.Kernel.EventName[] = mm([...this.#listeners.keys()], event);

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
