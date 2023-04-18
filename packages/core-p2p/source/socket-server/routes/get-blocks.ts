import { Codecs } from "../codecs";
import { GetBlocksController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetBlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/blocks/getBlocks": {
				codec: Codecs.getBlocks,
				handler: controller.handle,
				id: "p2p.blocks.getBlocks",
				maxBytes: 1024,
				validation: Schemas.getBlocks,
			},
		};
	}

	protected getController(): GetBlocksController {
		return this.app.resolve(GetBlocksController);
	}
}
