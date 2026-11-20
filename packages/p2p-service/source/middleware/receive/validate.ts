import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { CloseReason, RequestError } from "@mainsail/p2p-websocket";

import type { RouteDefinition } from "../../interfaces/index.js";

// Checks the decoded request against the schema of its route before anything else looks at it. A peer
// runs the same definitions, so a request that does not fit is a protocol violation: it is answered
// 400 and the connection is closed for that reason, which costs the peer a ban. Bound right after the
// codec middleware and before every step that reads the request.
@injectable()
export class ValidateReceiveMiddleware implements Interfaces.ReceiveMiddleware {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	public async before(context: Interfaces.ReceiveContext): Promise<void> {
		const { path, schema } = context.route as RouteDefinition<unknown, unknown>;
		if (!schema?.request) {
			return;
		}

		const { error } = this.validator.validate(schema.request, context.request.data);
		if (error) {
			throw new RequestError(400, `Invalid ${path} request: ${error}`, {
				closeReason: CloseReason.ProtocolError,
			});
		}
	}
}
