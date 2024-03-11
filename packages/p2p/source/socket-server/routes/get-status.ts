import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetStatusController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class GetStatusRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getStatus": {
				codec: Codecs.getStatus,
				handler: controller.handle,
				id: Routes.GetStatus,
				maxBytes: 1024,
				validation: Schemas.getStatus(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetStatusController {
		return this.app.resolve(GetStatusController);
	}
}
