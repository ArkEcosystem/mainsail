import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetStatusController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route } from "./route.js";

@injectable()
export class GetStatusRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/getStatus": {
				codec: Codecs.getStatus,
				id: Routes.GetStatus,
				maxBytes: 1024,
				validation: Schemas.getStatus(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetStatusController {
		return this.app.resolve(GetStatusController);
	}
}
