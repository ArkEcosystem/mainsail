import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostPrecommitController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class PostPrecommitRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postPrecommit": {
				codec: Codecs.postPrecommit,
				handler: controller.handle,
				id: Routes.PostPrecommit,
				maxBytes: constants.MAX_PAYLOAD_SERVER,
				validation: Schemas.postPrecommit(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): PostPrecommitController {
		return this.app.resolve(PostPrecommitController);
	}
}
