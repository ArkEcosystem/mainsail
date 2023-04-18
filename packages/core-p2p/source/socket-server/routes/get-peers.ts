import { getPeers } from "../codecs/peer";
import { GetPeersController } from "../controllers";
import { peerSchemas } from "../schemas/peer";
import { Route, RouteConfig } from "./route";

export class GetPeersRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getPeers": {
				codec: getPeers,
				handler: controller.handle,
				id: "p2p.peer.getPeers",
				maxBytes: 1024,
				validation: peerSchemas.getPeers,
			},
		};
	}

	protected getController(): GetPeersController {
		return this.app.resolve(GetPeersController);
	}
}
