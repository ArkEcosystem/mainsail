import { Codecs } from "../codecs";
import { GetCommonBlocksController } from "../controllers";
import { peerSchemas } from "../schemas/peer";
import { Route, RouteConfig } from "./route";

export class GetCommonBlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/p2p/peer/getCommonBlocks": {
				codec: Codecs.getCommonBlocks,
				handler: controller.handle,
				id: "p2p.peer.getCommonBlocks",
				maxBytes: 10 * 1024,
				validation: peerSchemas.getCommonBlocks,
			},
		};
	}

	protected getController(): GetCommonBlocksController {
		return this.app.resolve(GetCommonBlocksController);
	}
}
