export type MethodArguments<T, K extends keyof T> = T[K] extends (...arguments_: infer A) => unknown ? A : never;

export type MethodReturn<T, K extends keyof T> = T[K] extends (...arguments_: infer _A) => infer R ? R : never;

export type Requests<T> = {
	[K in keyof T]: T[K] extends (...arguments_: infer _A) => infer R
		? R extends Promise<unknown>
			? K
			: never
		: never;
}[keyof T];

export type SuccessReply<T> = {
	id: number;
	result: T;
};

export type ErrorReply = {
	id: number;
	error: string;
};

export type Event = {
	event: string;
	data: string;
};

export type Reply<T = unknown> = SuccessReply<T> | ErrorReply;

export type RequestCallback<T = unknown> = {
	resolve: (result: T) => void;
	reject: (error: Error) => void;
};
export type RequestCallbacks<T = unknown> = RequestCallback<T>;

export type EventCallback<T = unknown> = (data: T) => void;

export interface Handler<T extends object> {
	handleRequest<K extends Requests<T>>(method: K): void;
}

export interface Subprocess<T> {
	getQueueSize(): number;
	kill(): Promise<number>;
	sendRequest<T>(method: string, ...arguments_: unknown[]): Promise<T>;
	registerEventHandler<T>(event: string, callback: EventCallback<T>): void;
}
