import { Routes } from "../../enums";
import { Codecs } from "../codecs";
import { GetProposalController } from "../controllers";
import { Schemas } from "../schemas";
import { Route, RouteConfig } from "./route";

export class GetProposalRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: RouteConfig } {
		const controller = this.getController();
		return {
			"/getProposal": {
				codec: Codecs.getProposal,
				handler: controller.handle,
				id: Routes.GetProposal,
				maxBytes: 1024,
				validation: Schemas.getProposal,
			},
		};
	}

	protected getController(): GetProposalController {
		return this.app.resolve(GetProposalController);
	}
}
