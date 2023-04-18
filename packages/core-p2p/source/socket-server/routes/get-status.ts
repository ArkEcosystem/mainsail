import { Codecs } from "../codecs";
import { GetStatusController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetStausRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getStatus": {
				codec: Codecs.getStatus,
				handler: controller.handle,
				id: "p2p.peer.getStatus",
				maxBytes: 1024,
				validation: Schemas.getStatus,
			},
		};
	}

	protected getController(): GetStatusController {
		return this.app.resolve(GetStatusController);
	}
}
