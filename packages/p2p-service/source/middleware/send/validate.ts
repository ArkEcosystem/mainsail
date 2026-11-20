import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { RouteDefinition } from "../../interfaces/index.js";

// Checks the decoded response against the schema of its route before the caller sees it. A response
// that does not fit fails the request; the caller reacts as to any other failure that is the peer's
// doing and bans it. Bound after the codec middleware, so `after` runs once the response is decoded.
@injectable()
export class ValidateSendMiddleware implements Interfaces.SendMiddleware {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	public async after(context: Interfaces.SendContext): Promise<void> {
		// The transport also sends to routes other packages define, which carry no schema.
		const { path, schema } = context.route as Partial<RouteDefinition<unknown, unknown>>;
		if (!schema) {
			return;
		}

		const { error } = this.validator.validate(schema.response, context.response.data);
		if (error) {
			throw new Error(`Invalid ${path} response from ${context.connection.remoteAddress}: ${error}`);
		}
	}
}
