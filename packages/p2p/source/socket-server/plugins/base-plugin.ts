import Boom from "@hapi/boom";
import { ResponseToolkit } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/index.js";
@injectable()
export class BasePlugin {
	@inject(Identifiers.P2P.Peer.Disposer)
	protected readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	protected disposeAndReturnBadRequest = (
		request: Contracts.P2P.Request,
		h: ResponseToolkit,
		error: string,
	): Boom.Boom => {
		h.response().header("connection", "close").code(500);

		this.peerDisposer.disposePeer(getPeerIp(request));
		return Boom.badRequest(error);
	};

	protected banAndReturnBadRequest = (
		request: Contracts.P2P.Request,
		h: ResponseToolkit,
		error: string,
	): Boom.Boom => {
		h.response().header("connection", "close").code(500);

		this.peerDisposer.banPeer(getPeerIp(request), new Error(error));
		return Boom.badRequest(error);
	};
}
