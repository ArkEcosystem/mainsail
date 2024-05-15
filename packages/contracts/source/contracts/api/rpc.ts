import Hapi from "@hapi/hapi";
import { SchemaObject } from "ajv";

export type Processor = {
	registerAction(action: Action): void;
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

export interface Action {
	name: string;
	handle: (parameters: any) => Promise<any>;
	schema: SchemaObject;
}

export enum ErrorCode {
	ParseError = -32_700,
	InvalidRequest = -32_600,
	MethodNotFound = -32_601,
	InvalidParameters = -32_602,
	InternalError = -32_603,
}
