import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetPeersController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

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
