import type { Request as HapiRequest } from "@hapi/hapi";
import type { Enums } from "@mainsail/constants";
import type { SchemaObject } from "ajv";

export type Processor = {
	registerAction(action: Action): void;
	process(request: HapiRequest): Promise<Response | Error | (Response | Error)[]>;
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

export interface Action {
	name: string;
	handle: (parameters: any) => Promise<any>;
	schema: SchemaObject;
}

export type ErrorCode = Enums.Rpc.ErrorCode;
