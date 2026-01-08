import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostMessageController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route } from "./route.js";

@injectable()
export class PostMessageRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/postMessage": {
				codec: Codecs.postMessage,
				id: Routes.PostMessage,
				maxBytes: constants.MAX_PAYLOAD_SERVER,
				validation: Schemas.postMessage(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): PostMessageController {
		return this.app.resolve(PostMessageController);
	}
}
