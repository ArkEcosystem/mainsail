import { injectable } from "@mainsail/container";

import type { SendContext, SendMiddleware } from "../../interfaces/index.js";

import { RequestError } from "../../errors.js";

// Encodes an outgoing request with the route's codec and decodes the response with it.
@injectable()
export class SendCodecMiddleware implements SendMiddleware {
	public async before(context: SendContext): Promise<void> {
		context.request.payload = context.route.codec.request.serialize(context.request.data);
	}

	public async after(context: SendContext): Promise<void> {
		const { codec } = context.route;

		try {
			context.response.data = codec.response.deserialize(context.response.payload);
		} catch (error) {
			throw new RequestError(500, `Cannot decode ${context.route.path} response`, { cause: error });
		}
	}
}
