import { Request, ResponseToolkit, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";

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
