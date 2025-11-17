export interface EventListener {
	handle(payload: { name: string; data: any }): void;
}

export interface EventDispatcher {
	listen(event: string, listener: EventListener): () => void;

	listenMany(events: Array<[string, EventListener]>): Map<string, () => void>;

	listenOnce(name: string, listener: EventListener): void;

	forget(event: string, listener?: EventListener): void;

	forgetMany(events: Array<[string, EventListener]>): void;

	flush(): void;

	getListeners(event: string): EventListener[];

	hasListeners(event: string): boolean;

	dispatch<T = any>(event: string, data?: T): Promise<void>;

	dispatchSeq<T = any>(event: string, data?: T): Promise<void>;

	dispatchSync<T = any>(event: string, data?: T): void;

	dispatchMany<T = any>(events: Array<[string, T]>): Promise<void>;

	dispatchManySeq<T = any>(events: Array<[string, T]>): Promise<void>;

	dispatchManySync<T = any>(events: Array<[string, T]>): void;
}
