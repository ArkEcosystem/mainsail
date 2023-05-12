import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetStatusController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetStausRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getStatus": {
				codec: Codecs.getStatus,
				handler: controller.handle,
				id: Routes.GetStatus,
				maxBytes: 1024,
				validation: Schemas.getStatus,
			},
		};
	}

	protected getController(): GetStatusController {
		return this.app.resolve(GetStatusController);
	}
}
