import type {
	Plugin,
	Request,
	ResponseToolkit,
	Server as HapiServer,
	ServerInjectOptions,
	ServerInjectResponse,
	ServerRoute,
} from "@hapi/hapi";
import type { Schema } from "joi";

import type { Response } from "./endpoints.js";

export interface Controller {
	handle(request: Request, h: ResponseToolkit): Promise<Response>;
}

export interface Server {
	initialize(name: string, optionsServer: { hostname: string; port: number }): Promise<void>;
	boot(): Promise<void>;
	dispose(): Promise<void>;
	register(plugins: Plugin<unknown, unknown>): Promise<void>; // TODO: Add proper types
	route(routes: ServerRoute | ServerRoute[]): Promise<void>;
	inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse>;
}

export type Codec = {
	request: {
		serialize: (object: object) => Buffer;
		deserialize: (payload: Buffer) => object;
	};
	response: {
		serialize: (object: object) => Buffer;
		deserialize: (payload: Buffer) => object;
	};
};

export type RouteConfig = {
	id: string;
	validation?: Schema;
	codec: Codec;
	maxBytes?: number;
};

export interface Route {
	register(server: HapiServer): void;
	getRoutesConfigByPath(): { [path: string]: RouteConfig };
}
