import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject, optional } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import type { Connection, ReceiveContext, ReceiveMiddleware, Response, Route } from "./interfaces/index.js";

import { CloseReason } from "./enums.js";
import { RequestError } from "./errors.js";

// Maps request paths to routes and runs each request through the middleware chain. Middleware is
// bound under Identifiers.P2P.WebSocket.ReceiveMiddleware; routes are registered by the package that
// owns them when it boots, since they depend on services (consensus) that depend on the transport.
@injectable()
export class Router {
	@inject(Identifiers.P2P.WebSocket.Logger)
	private readonly logger!: Contracts.Kernel.Logger;

	@multiInject(Identifiers.P2P.WebSocket.ReceiveMiddleware)
	@optional()
	private readonly middleware: ReceiveMiddleware[] = [];

	readonly #byPath = new Map<string, Route<unknown, unknown>>();

	public register(route: Route<unknown, unknown>): void {
		if (this.#byPath.has(route.path)) {
			throw new Error(`Duplicate route: ${route.path}`);
		}

		this.#byPath.set(route.path, route);
	}

	public get paths(): string[] {
		return [...this.#byPath.keys()];
	}

	public async handle(connection: Connection, path: string, payload: Buffer): Promise<Response> {
		try {
			// The paths are part of the protocol both sides share (see PROTOCOL_VERSION), so a request for a
			// path we do not have comes from something that is not a peer of ours.
			const route = this.#byPath.get(path);
			if (!route) {
				throw new RequestError(404, `Unknown route ${path}`, { closeReason: CloseReason.ProtocolError });
			}

			// Checked before the middleware so an oversized request is never decoded or handled.
			if (payload.length > route.maxPayload.request) {
				throw new RequestError(
					413,
					`${path} request of ${payload.length} bytes exceeds ${route.maxPayload.request}`,
					{
						closeReason: CloseReason.PayloadTooLarge,
					},
				);
			}

			const context: ReceiveContext = { connection, request: { payload }, response: {}, route };

			return await this.#run(context);
		} catch (rawError) {
			const error = ensureError(rawError);
			const statusCode = error instanceof RequestError ? error.statusCode : 500;
			this.logger.debug(
				`${path} from ${connection.remoteAddress} failed (${statusCode}): ${error.message}`,
				"p2p",
			);

			// The peer knew the rules it broke; the owner sees the reason on close.
			if (error instanceof RequestError && error.closeReason) {
				connection.terminate(error.closeReason, error);
			}

			return { payload: Buffer.alloc(0), statusCode };
		}
	}

	// Steps whose `before` completed get their `finally`, in reverse, even when a later step or the route threw.
	async #run(context: ReceiveContext): Promise<Response> {
		const started: ReceiveMiddleware[] = [];

		try {
			for (const step of this.middleware) {
				await step.before?.(context);
				started.push(step);
			}

			context.response.data = await context.route.handle(context.connection, context.request.data);

			for (const step of [...this.middleware].reverse()) {
				await step.after?.(context);
			}

			if (!context.response.payload) {
				throw new Error(
					`No middleware encoded the ${context.route.path} response; is the codec middleware registered?`,
				);
			}

			return { payload: context.response.payload, statusCode: 200 };
		} finally {
			for (const step of started.reverse()) {
				await step.finally?.(context);
			}
		}
	}
}
