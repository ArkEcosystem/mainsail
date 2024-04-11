import { constants } from "../../constants.js";
import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { PostProposalController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route, RouteConfig } from "./route.js";

export class PostProposalRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/postProposal": {
				codec: Codecs.postProposal,
				handler: controller.handle,
				id: Routes.PostProposal,
				maxBytes: constants.MAX_PAYLOAD_SERVER,
				validation: Schemas.postProposal(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): PostProposalController {
		return this.app.resolve(PostProposalController);
	}
}
