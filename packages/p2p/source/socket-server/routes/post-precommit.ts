import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostPrecommitController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route } from "./route.js";

@injectable()
export class PostPrecommitRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/postPrecommit": {
				codec: Codecs.postPrecommit,
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
