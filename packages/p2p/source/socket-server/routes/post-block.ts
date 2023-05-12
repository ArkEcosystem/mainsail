import { constants } from "../../constants";
import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { PostBlockController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class PostBlockRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postBlock": {
				codec: Codecs.postBlock,
				handler: controller.handle,
				id: Routes.PostBlock,
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: Schemas.postBlock,
			},
		};
	}

	protected getController(): PostBlockController {
		return this.app.resolve(PostBlockController);
	}
}
