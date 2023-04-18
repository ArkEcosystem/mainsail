import { constants } from "../../constants";
import { Codecs } from "../codecs";
import { PostBlockController } from "../controllers";
import { blocksSchemas } from "../schemas/blocks";
import { Route, RouteConfig } from "./route";

export class PostBlockRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/blocks/postBlock": {
				codec: Codecs.postBlock,
				handler: controller.handle,
				id: "p2p.blocks.postBlock",
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: blocksSchemas.postBlock,
			},
		};
	}

	protected getController(): PostBlockController {
		return this.app.resolve(PostBlockController);
	}
}
