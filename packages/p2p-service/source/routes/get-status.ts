import type { Interfaces } from "@mainsail/p2p-websocket";

import { injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.getStatus.request.deserialize>;
type Response = ReturnType<typeof Codecs.getStatus.response.deserialize>;

export const GetStatus: Interfaces.RouteDefinition<Request, Response> = { codec: Codecs.getStatus, path: "getStatus" };

// Same wire shape as the old p2p endpoint. State and config are fixed until the state store and
// peer config are wired in; enough for peers to exchange a real protobuf message.
@injectable()
export class GetStatusRoute implements Interfaces.Route<Request, Response> {
	public readonly path = GetStatus.path;
	public readonly codec = GetStatus.codec;

	public async handle(_: Interfaces.Connection, __: Request): Promise<Response> {
		return {
			config: {
				network: { explorer: "", name: "devnet", nethash: "", token: { name: "", symbol: "" }, version: 0 },
				plugins: {},
				version: "0.0.1",
			},
			state: { blockHash: "0".repeat(64), blockNumber: 1 },
		};
	}
}
