import type { Contracts } from "@mainsail/contracts";

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { getPeerIp } from "../../utils/index.js";
@injectable()
export class BasePlugin {
	@inject(Identifiers.P2P.Peer.Disposer)
	protected readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	protected disposeAndReturnBadRequest = (request: Contracts.P2P.Request, error: string): Boom.Boom => {
		this.peerDisposer.disposePeer(getPeerIp(request));
		return Boom.badRequest(error);
	};

	protected banAndReturnBadRequest = (request: Contracts.P2P.Request, error: string): Boom.Boom => {
		this.peerDisposer.banPeer(getPeerIp(request), new Error(error));
		return Boom.badRequest(error);
	};
}
