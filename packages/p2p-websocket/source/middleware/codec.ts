import { injectable } from "@mainsail/container";

import type { Middleware, RequestContext } from "../interfaces.js";

import { RequestError } from "../errors.js";

// Decodes the request with the route's codec and encodes the response with it. Routes without a
// codec are passed through untouched.
@injectable()
export class CodecMiddleware implements Middleware {
	public async before(context: RequestContext): Promise<void> {
		const { codec } = context.route;
		if (!codec) {
			return;
		}

		try {
			context.request.data = codec.request.deserialize(context.request.payload);
		} catch (error) {
			throw new RequestError(400, `Cannot decode ${context.route.path} request`, { cause: error });
		}
	}

	public async after(context: RequestContext): Promise<void> {
		const { codec } = context.route;
		if (!codec) {
			return;
		}

		context.response.payload = codec.response.serialize(context.response.data);
	}
}
