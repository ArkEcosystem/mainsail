import { getBlocks } from "../codecs/blocks";
import { GetBlocksController } from "../controllers";
import { blocksSchemas } from "../schemas/blocks";
import { Route, RouteConfig } from "./route";

export class GetBlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/blocks/getBlocks": {
				codec: getBlocks,
				handler: controller.handle,
				id: "p2p.blocks.getBlocks",
				maxBytes: 1024,
				validation: blocksSchemas.getBlocks,
			},
		};
	}

	protected getController(): GetBlocksController {
		return this.app.resolve(GetBlocksController);
	}
}
