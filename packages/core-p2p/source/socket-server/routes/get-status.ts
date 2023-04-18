import { getStatus } from "../codecs/peer";
import { GetStatusController } from "../controllers";
import { peerSchemas } from "../schemas/peer";
import { Route, RouteConfig } from "./route";

export class GetStausRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getStatus": {
				codec: getStatus,
				handler: controller.handle,
				id: "p2p.peer.getStatus",
				maxBytes: 1024,
				validation: peerSchemas.getStatus,
			},
		};
	}

	protected getController(): GetStatusController {
		return this.app.resolve(GetStatusController);
	}
}
