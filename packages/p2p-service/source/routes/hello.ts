import type { Connection, Route, RouteDefinition } from "@mainsail/p2p-websocket";

import { injectable } from "@mainsail/container";

export const Hello: RouteDefinition = { path: "hello" };

// Raw endpoint without a codec; answers with whatever it was sent.
@injectable()
export class HelloRoute implements Route {
	public readonly path = Hello.path;

	public async handle(_: Connection, data: Buffer): Promise<Buffer> {
		return data;
	}
}
