import { Request, ResponseToolkit, Server as HapiServer, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";
import { Schema } from "joi";

export interface Controller {
	handle(request: Request, h: ResponseToolkit): Promise<any>;
}

export interface Server {
	initialize(name: string, optionsServer: { hostname: string; port: number }): Promise<void>;
	boot(): Promise<void>;
	dispose(): Promise<void>;
	register(plugins: any): Promise<void>; // TODO: Add proper types
	route(routes: ServerRoute | ServerRoute[]): Promise<void>;
	inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse>;
}

export type Codec = {
	request: {
		serialize: any;
		deserialize: any;
	};
	response: {
		serialize: any;
		deserialize: any;
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
