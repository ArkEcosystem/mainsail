import mm from "nanomatch";

import { EventDispatcher as EventDispatcherContract, EventListener, EventName } from "../../../contracts/kernel/events";
import { injectable } from "../../../ioc";
import { assert } from "../../../utils";

class OnceListener implements EventListener {
	public constructor(
		private readonly dispatcher: EventDispatcherContract,
		private readonly listener: EventListener,
	) {}

	public async handle({ name }): Promise<void> {
		this.dispatcher.forget(name, this.listener);
	}
}

@injectable()
export class MemoryEventDispatcher implements EventDispatcherContract {
	private readonly listeners: Map<EventName, Set<EventListener>> = new Map<EventName, Set<EventListener>>();

	public listen(event: EventName, listener: EventListener): () => void {
		this.getListenersByEvent(event).add(listener);

		return this.forget.bind(this, event, listener);
	}

	public listenMany(events: Array<[EventName, EventListener]>): Map<EventName, () => void> {
		const listeners: Map<EventName, () => void> = new Map<EventName, () => void>();

		for (const [event, listener] of events) {
			listeners.set(event, this.listen(event, listener));
		}

		return listeners;
	}

	public listenOnce(name: EventName, listener: EventListener): void {
		this.listen(name, listener);

		this.listen(name, new OnceListener(this, listener));
	}

	public forget(event: EventName, listener?: EventListener): boolean {
		if (event && listener) {
			return this.getListenersByEvent(event).delete(listener);
		}

		return this.listeners.delete(event);
	}

	public forgetMany(events: EventName[] | Array<[EventName, EventListener]>): void {
		for (const event of events) {
			Array.isArray(event) ? this.forget(event[0], event[1]) : this.forget(event);
		}
	}

	public flush(): void {
		this.listeners.clear();
	}

	public getListeners(event?: EventName): EventListener[] {
		return [...this.getListenersByPattern(event || "*").values()];
	}

	public hasListeners(event: EventName): boolean {
		return this.getListenersByPattern(event).length > 0;
	}

	public countListeners(event?: EventName): number {
		if (event) {
			return this.getListenersByPattern(event).length;
		}

		let totalCount = 0;
		for (const values of this.listeners.values()) {
			totalCount += values.size;
		}

		return totalCount;
	}

	public async dispatch<T = any>(event: EventName, data?: T): Promise<void> {
		await Promise.resolve();

		const resolvers: Array<Promise<void>> = [];

		for (const listener of this.getListenersByPattern(event)) {
			resolvers.push(new Promise((resolve) => resolve(listener.handle({ name: event, data }))));
		}

		await Promise.all(resolvers);
	}

	public async dispatchSeq<T = any>(event: EventName, data?: T): Promise<void> {
		await Promise.resolve();

		for (const listener of this.getListenersByPattern(event)) {
			await listener.handle({ name: event, data });
		}
	}

	public dispatchSync<T = any>(event: EventName, data?: T): void {
		for (const listener of this.getListenersByPattern(event)) {
			listener.handle({ name: event, data });
		}
	}

	public async dispatchMany<T = any>(events: Array<[EventName, T]>): Promise<void> {
		await Promise.all(Object.values(events).map((value: [EventName, T]) => this.dispatch(value[0], value[1])));
	}

	public async dispatchManySeq<T = any>(events: Array<[EventName, T]>): Promise<void> {
		for (const value of Object.values(events)) {
			await this.dispatchSeq(value[0], value[1]);
		}
	}

	public dispatchManySync<T = any>(events: Array<[EventName, T]>): void {
		for (const value of Object.values(events)) {
			this.dispatchSync(value[0], value[1]);
		}
	}

	private getListenersByEvent(name: EventName): Set<EventListener> {
		if (!this.listeners.has(name)) {
			this.listeners.set(name, new Set<EventListener>());
		}

		const listener: Set<EventListener> | undefined = this.listeners.get(name);

		assert.defined<Set<EventListener>>(listener);

		return listener;
	}

	private getListenersByPattern(event: EventName): EventListener[] {
		// @ts-ignore
		const matches: EventName[] = mm([...this.listeners.keys()], event);

		let eventListeners: EventListener[] = [];
		if (this.listeners.has("*")) {
			eventListeners = eventListeners.concat([...this.getListenersByEvent("*")]);
		}

		for (const match of matches) {
			const matchListeners: Set<EventListener> | undefined = this.getListenersByEvent(match);

			if (matchListeners && matchListeners.size > 0) {
				eventListeners = eventListeners.concat([...matchListeners]);
			}
		}

		return eventListeners;
	}
}
