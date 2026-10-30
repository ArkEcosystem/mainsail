import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject, optional, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import type { Connection, ReceiveContext, ReceiveMiddleware, Response, Route } from "./interfaces/index.js";

import { RequestError } from "./errors.js";

// Maps request paths to routes and runs each request through the middleware chain. Any package can
// contribute routes and middleware by binding them under Identifiers.P2P.WebSocket.Routes and
// Identifiers.P2P.WebSocket.ReceiveMiddleware before the router is first resolved.
@injectable()
export class Router {
	@inject(Identifiers.P2P.WebSocket.Logger)
	private readonly logger!: Contracts.Kernel.Logger;

	@multiInject(Identifiers.P2P.WebSocket.Routes)
	@optional()
	private readonly routes: Route<unknown, unknown>[] = [];

	@multiInject(Identifiers.P2P.WebSocket.ReceiveMiddleware)
	@optional()
	private readonly middleware: ReceiveMiddleware[] = [];

	readonly #byPath = new Map<string, Route<unknown, unknown>>();

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

		const context: ReceiveContext = { connection, request: { payload }, response: {}, route };

		try {
			for (const step of this.middleware) {
				await step.before?.(context);
			}

			context.response.data = await route.handle(connection, context.request.data);

			for (const step of [...this.middleware].reverse()) {
				await step.after?.(context);
			}

			if (!context.response.payload) {
				throw new Error(`No middleware encoded the ${path} response; is the codec middleware registered?`);
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			const statusCode = error instanceof RequestError ? error.statusCode : 500;
			this.logger.debug(
				`${path} from ${connection.remoteAddress} failed (${statusCode}): ${error.message}`,
				"p2p",
			);
			return { payload: Buffer.alloc(0), statusCode };
		}

		return { payload: context.response.payload, statusCode: 200 };
	}
}
