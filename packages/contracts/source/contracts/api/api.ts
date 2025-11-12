import type { Server as HapiServer } from "@hapi/hapi";

import type { Application } from "../kernel/application.js";
import type { Processor } from "./rpc.js";

export type ApiServer = HapiServer<ServerState>;

export interface Server {
	boot(): Promise<void>;
	dispose(): Promise<void>;
}

declare const ServerTypeValues: {
	readonly Http: "HTTP";
	readonly Https: "HTTPS";
};
export type ServerType = (typeof ServerTypeValues)[keyof typeof ServerTypeValues];

export interface ServerState {
	app: Application;
	schemas: any;
	rpc: Processor;
}

export type Sorting = {
	property: string;
	direction: "asc" | "desc";
}[];

export type Pagination = {
	offset: number;
	limit: number;
};

export type ResultsPage<T> = {
	results: T[];
	totalCount: number;
	meta?: { totalCountIsEstimate?: boolean };
};

export interface Resource {
	transform(resource: object): object;
}
