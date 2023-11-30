import { constants } from "../../constants";
import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { PostPrevoteController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class PostPrevoteRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postPrevote": {
				codec: Codecs.postPrevote,
				handler: controller.handle,
				id: Routes.PostPrevote,
				maxBytes: constants.DEFAULT_MAX_PAYLOAD_SERVER,
				validation: Schemas.postPrevote(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): PostPrevoteController {
		return this.app.resolve(PostPrevoteController);
	}
}
