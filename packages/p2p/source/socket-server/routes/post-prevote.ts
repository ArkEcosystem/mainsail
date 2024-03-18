import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostPrevoteController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class PostPrevoteRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postPrevote": {
				codec: Codecs.postPrevote,
				handler: controller.handle,
				id: Routes.PostPrevote,
				maxBytes: constants.MAX_PAYLOAD_SERVER,
				validation: Schemas.postPrevote(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): PostPrevoteController {
		return this.app.resolve(PostPrevoteController);
	}
}
