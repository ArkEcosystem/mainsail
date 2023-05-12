export type EventName = string | symbol;

export interface EventListener {
	handle(payload: { name: EventName; data: any }): void;
}

export interface EventDispatcher {
	listen(event: EventName, listener: EventListener): () => void;

	listenMany(events: Array<[EventName, EventListener]>): Map<EventName, () => void>;

	listenOnce(name: EventName, listener: EventListener): void;

	forget(event: EventName, listener?: EventListener): void;

	forgetMany(events: Array<[EventName, EventListener]>): void;

	flush(): void;

	getListeners(event: EventName): EventListener[];

	hasListeners(event: EventName): boolean;

	dispatch<T = any>(event: EventName, data?: T): Promise<void>;

	dispatchSeq<T = any>(event: EventName, data?: T): Promise<void>;

	dispatchSync<T = any>(event: EventName, data?: T): void;

	dispatchMany<T = any>(events: Array<[EventName, T]>): Promise<void>;

	dispatchManySeq<T = any>(events: Array<[EventName, T]>): Promise<void>;

	dispatchManySync<T = any>(events: Array<[EventName, T]>): void;
}
