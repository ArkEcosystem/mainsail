import { constants } from "../../constants";
import { getBlocks, postBlock } from "../codecs/blocks";
import { BlocksController } from "../controllers/blocks";
import { blocksSchemas } from "../schemas/blocks";
import { Route, RouteConfig } from "./route";

export class BlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/blocks/getBlocks": {
				codec: getBlocks,
				handler: controller.getBlocks,
				id: "p2p.blocks.getBlocks",
				maxBytes: 1024,
				validation: blocksSchemas.getBlocks,
			},
			"/p2p/blocks/postBlock": {
				codec: postBlock,
				handler: controller.postBlock,
				id: "p2p.blocks.postBlock",
				maxBytes: constants.DEFAULT_MAX_PAYLOAD,
				validation: blocksSchemas.postBlock,
			},
		};
	}

	protected getController(): BlocksController {
		return this.app.resolve(BlocksController);
	}
}
