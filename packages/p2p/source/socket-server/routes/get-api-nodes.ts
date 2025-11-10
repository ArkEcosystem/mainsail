import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetApiNodesController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route } from "./route.js";

@injectable()
export class GetApiNodesRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/getApiNodes": {
				codec: Codecs.getApiNodes,
				id: Routes.GetApiNodes,
				maxBytes: 1024,
				validation: Schemas.getApiNodes(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetApiNodesController {
		return this.app.resolve(GetApiNodesController);
	}
}
