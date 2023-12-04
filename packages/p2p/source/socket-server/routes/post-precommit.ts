import { constants } from "../../constants";
import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { PostPrecommitController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

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
