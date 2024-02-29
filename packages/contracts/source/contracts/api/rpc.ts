import Hapi from "@hapi/hapi";

export type Processor = {
	process(request: Hapi.Request): Promise<Response | Error>;
};

export type Id = string | number | null;

export type Request<T> = {
	id: Id;
	jsonrpc: "2.0";
	method: string;
	params: T;
};

export type Response = {
	id: Id;
	jsonrpc: "2.0";
	result: any;
};

export type Error = {
	id: Id;
	jsonrpc: "2.0";
	error: {
		code: number;
		message: string;
	};
};
