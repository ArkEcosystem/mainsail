import { getCommonBlocks, getPeers, getStatus } from "../codecs/peer";
import { PeerController } from "../controllers/peer";
import { peerSchemas } from "../schemas/peer";
import { Route, RouteConfig } from "./route";

export class PeerRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getCommonBlocks": {
				codec: getCommonBlocks,
				handler: controller.getCommonBlocks,
				id: "p2p.peer.getCommonBlocks",
				maxBytes: 10 * 1024,
				validation: peerSchemas.getCommonBlocks,
			},
			"/p2p/peer/getPeers": {
				codec: getPeers,
				handler: controller.getPeers,
				id: "p2p.peer.getPeers",
				maxBytes: 1024,
				validation: peerSchemas.getPeers,
			},
			"/p2p/peer/getStatus": {
				codec: getStatus,
				handler: controller.getStatus,
				id: "p2p.peer.getStatus",
				maxBytes: 1024,
				validation: peerSchemas.getStatus,
			},
		};
	}

	protected getController(): PeerController {
		return this.app.resolve(PeerController);
	}
}
