import type { Connection } from "./connection.js";
import type { CloseReason } from "./enums.js";
import type { Response } from "./handlers/request-table.js";

// One check run before a socket is accepted. Returning a reason rejects the socket;
// `undefined` passes it on to the next verifier.
export interface ConnectionVerifier {
	verify(ip: string): CloseReason | undefined;
}

// One request path. `maxBytes`, `codec` and `schema` are read by middleware; the handler itself
// receives whatever the chain leaves in the payload.
export interface Route {
	readonly path: string;
	readonly maxBytes?: number;
	readonly codec?: {
		request: { deserialize: (payload: Buffer) => unknown };
		response: { serialize: (data: unknown) => Buffer };
	};
	readonly schema?: string;

	handle(connection: Connection, payload: Buffer): Promise<Response>;
}
