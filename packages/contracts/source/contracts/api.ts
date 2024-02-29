import Hapi from "@hapi/hapi";

import { Application } from "./kernel";

export type ApiServer = Hapi.Server<ServerState>;

export enum ServerType {
	Http = "HTTP",
	Https = "HTTPS",
}

export interface ServerState {
	app: Application;
	schemas: any;
	rpc: RpcProcessor;
}

export type RpcProcessor = {
	process(request: Hapi.Request): any;
};

export type RpcId = string | number | null;

export type RpcRequest<T> = {
	id: RpcId;
	jsonrpc: "2.0";
	method: string;
	params: T;
};

export type RpcResponse = {
	id: RpcId;
	jsonrpc: "2.0";
	error: {
		code: number;
		message: string;
	};
};

export type RpcError = {
	id: RpcId;
	jsonrpc: "2.0";
	error: {
		code: number;
		message: string;
	};
};

export type Sorting = {
	property: string;
	direction: "asc" | "desc";
}[];

export type Pagination = {
	offset: number;
	limit: number;
};

export type Options = {
	estimateTotalCount?: boolean;
};

export type ResultsPage<T> = {
	results: T[];
	totalCount: number;
	meta?: { totalCountIsEstimate?: boolean };
};

export interface Resource {
	raw(resource): object;
	transform(resource): object;
}
