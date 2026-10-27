import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject, optional, postConstruct } from "@mainsail/container";

import type { Connection } from "./connection.js";
import type { Response } from "./handlers/request-table.js";
import type { Route } from "./interfaces.js";

// Maps request paths to routes. Any package can contribute a route by binding it under
// Identifiers.P2P.WebSocket.Routes before the router is first resolved.
@injectable()
export class Router {
	@inject(Identifiers.P2P.WebSocket.Logger)
	private readonly logger!: Contracts.Kernel.Logger;

	@multiInject(Identifiers.P2P.WebSocket.Routes)
	@optional()
	private readonly routes: Route[] = [];

	readonly #byPath = new Map<string, Route>();

	@postConstruct()
	public initialize(): void {
		for (const route of this.routes) {
			if (this.#byPath.has(route.path)) {
				throw new Error(`Duplicate route: ${route.path}`);
			}

			this.#byPath.set(route.path, route);
		}
	}

	public get paths(): string[] {
		return [...this.#byPath.keys()];
	}

	public async handle(connection: Connection, path: string, payload: Buffer): Promise<Response> {
		const route = this.#byPath.get(path);
		if (!route) {
			this.logger.debug(`Unknown route ${path} requested by ${connection.remoteAddress}`, "p2p");
			return { payload: Buffer.alloc(0), statusCode: 404 };
		}

		return route.handle(connection, payload);
	}
}
