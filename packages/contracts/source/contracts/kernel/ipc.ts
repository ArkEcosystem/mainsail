export type Actions<T extends {}> = {
	[K in keyof T]: T[K] extends (...arguments_: any[]) => any ? (ReturnType<T[K]> extends void ? K : never) : never;
}[keyof T];

export type Requests<T extends {}> = {
	[K in keyof T]: T[K] extends (...arguments_: any[]) => any
		? ReturnType<T[K]> extends Promise<any>
			? K
			: never
		: never;
}[keyof T];

export type SuccessReply = {
	id: number;
	result: any;
};

export type ErrorReply = {
	id: number;
	error: string;
};

export type Reply = SuccessReply | ErrorReply;

export type RequestCallback<T extends {}, K extends Requests<T>> = {
	// @ts-ignore
	resolve: (result: ReturnType<T[K]>) => void;
	reject: (error: Error) => void;
};

export type RequestCallbacks<T extends {}> = RequestCallback<T, Requests<T>>;

export interface Handler<T extends {}> {
	handleRequest<K extends Requests<T>>(method: K): void;
}

export interface Subprocess<T extends {}> {
	getQueueSize(): number;
	kill(): Promise<number>;
	sendRequest(method: string, ...arguments_: any): Promise<any>;
}
