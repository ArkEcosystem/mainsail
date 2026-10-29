import type { Connection, Route } from "@mainsail/p2p-websocket";

import { injectable } from "@mainsail/container";

// First application-level endpoint; answers with whatever it was sent.
@injectable()
export class HelloRoute implements Route {
	public readonly path = "hello";

	public async handle(_: Connection, data: Buffer): Promise<Buffer> {
		return data;
	}
}
