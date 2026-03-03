export interface EventListener<T = unknown> {
	handle(payload: { name: string; data: T }): Promise<void>;
}

export interface EventDispatcher<T = unknown> {
	listen(event: string, listener: EventListener<T>): () => void;

	listenMany(events: Array<[string, EventListener<T>]>): Map<string, () => void>;

	listenOnce(name: string, listener: EventListener<T>): void;

	forget(event: string, listener?: EventListener<T>): void;

	forgetMany(events: Array<[string, EventListener<T>]>): void;

	flush(): void;

	getListeners(event: string): EventListener<T>[];

	hasListeners(event: string): boolean;

	dispatch<T = unknown>(event: string, data?: T): Promise<void>;

	dispatchMany<T = unknown>(events: Array<[string, T]>): Promise<void>;
}
