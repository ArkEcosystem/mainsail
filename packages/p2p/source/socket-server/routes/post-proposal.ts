import { constants } from "../../constants";
import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { PostProposalController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

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
