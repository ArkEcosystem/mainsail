import { Codecs } from "../codecs";
import { GetPeersController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetPeersRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getPeers": {
				codec: Codecs.getPeers,
				handler: controller.handle,
				id: "p2p.peer.getPeers",
				maxBytes: 1024,
				validation: Schemas.getPeers,
			},
		};
	}

	protected getController(): GetPeersController {
		return this.app.resolve(GetPeersController);
	}
}
