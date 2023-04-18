import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetCommonBlocksController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";
export class GetCommonBlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getCommonBlocks": {
				codec: Codecs.getCommonBlocks,
				handler: controller.handle,
				id: Routes.GetCommonBlocks,
				maxBytes: 10 * 1024,
				validation: Schemas.getCommonBlocks,
			},
		};
	}

	protected getController(): GetCommonBlocksController {
		return this.app.resolve(GetCommonBlocksController);
	}
}
