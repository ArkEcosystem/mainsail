import { injectable } from "@mainsail/container";

import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetBlocksController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

@injectable()
export class GetBlocksRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		return {
			"/getBlocks": {
				codec: Codecs.getBlocks,
				id: Routes.GetBlocks,
				maxBytes: 1024,
				validation: Schemas.getBlocks(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetBlocksController {
		return this.app.resolve(GetBlocksController);
	}
}
