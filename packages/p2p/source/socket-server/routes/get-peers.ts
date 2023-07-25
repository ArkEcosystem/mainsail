import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetPeersController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetPeersRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getPeers": {
				codec: Codecs.getPeers,
				handler: controller.handle,
				id: Routes.GetPeers,
				maxBytes: 1024,
				validation: Schemas.getPeers(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetPeersController {
		return this.app.resolve(GetPeersController);
	}
}
