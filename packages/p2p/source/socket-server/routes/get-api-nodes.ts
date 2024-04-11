import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetApiNodesController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class GetApiNodesRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getApiNodes": {
				codec: Codecs.getApiNodes,
				handler: controller.handle,
				id: Routes.GetApiNodes,
				maxBytes: 1024,
				validation: Schemas.getApiNodes(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetApiNodesController {
		return this.app.resolve(GetApiNodesController);
	}
}
