import type { Connection, Response, Route } from "@mainsail/p2p-websocket";

import { injectable } from "@mainsail/container";

// First application-level endpoint; answers with whatever it was sent.
@injectable()
export class HelloRoute implements Route {
	public readonly path = "hello";

	public async handle(_: Connection, payload: Buffer): Promise<Response> {
		return { payload, statusCode: 200 };
	}
}
