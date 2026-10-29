import type { Connection, Route } from "@mainsail/p2p-websocket";

import { injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.getStatus.request.deserialize>;
type Response = Parameters<typeof Codecs.getStatus.response.serialize>[0];

// Same wire shape as the old p2p endpoint. State and config are fixed until the state store and
// peer config are wired in; enough for peers to exchange a real protobuf message.
@injectable()
export class GetStatusRoute implements Route<Request, Response> {
	public readonly path = "getStatus";
	public readonly codec = Codecs.getStatus;

	public async handle(_: Connection, __: Request): Promise<Response> {
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
