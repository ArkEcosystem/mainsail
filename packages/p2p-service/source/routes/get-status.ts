import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Codecs } from "../codecs/index.js";
import { getPeerConfig } from "../utils/index.js";

type Request = ReturnType<typeof Codecs.getStatus.request.deserialize>;
type Response = ReturnType<typeof Codecs.getStatus.response.deserialize>;

export const GetStatus: Interfaces.RouteDefinition<Request, Response> = { codec: Codecs.getStatus, path: "getStatus" };

@injectable()
export class GetStatusRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public readonly path = GetStatus.path;
	public readonly codec = GetStatus.codec;

	public async handle(): Promise<Response> {
		const lastBlock = this.stateStore.getLastBlock();

		return {
			config: getPeerConfig(this.app),
			state: {
				blockHash: lastBlock.hash,
				blockNumber: lastBlock.number,
			},
		};
	}
}
