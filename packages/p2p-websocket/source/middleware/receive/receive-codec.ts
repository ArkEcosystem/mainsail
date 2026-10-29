import { injectable } from "@mainsail/container";

import type { ReceiveContext, ReceiveMiddleware } from "../../interfaces.js";

import { RequestError } from "../../errors.js";

// Decodes the request with the route's codec and encodes the response with it.
@injectable()
export class ReceiveCodecMiddleware implements ReceiveMiddleware {
	public async before(context: ReceiveContext): Promise<void> {
		const { codec } = context.route;

		try {
			context.request.data = codec.request.deserialize(context.request.payload);
		} catch (error) {
			throw new RequestError(400, `Cannot decode ${context.route.path} request`, { cause: error });
		}
	}

	public async after(context: ReceiveContext): Promise<void> {
		context.response.payload = context.route.codec.response.serialize(context.response.data);
	}
}
