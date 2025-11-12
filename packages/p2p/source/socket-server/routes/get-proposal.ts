import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Routes } from "../../enums.js";
import { Codecs } from "../codecs/index.js";
import { GetProposalController } from "../controllers/index.js";
import { Schemas } from "../schemas/index.js";
import { Route } from "./route.js";

@injectable()
export class GetProposalRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/getProposal": {
				codec: Codecs.getProposal,
				id: Routes.GetProposal,
				maxBytes: 1024,
				validation: Schemas.getProposal(this.cryptoConfiguration),
			},
		};
	}

	protected getController(): GetProposalController {
		return this.app.resolve(GetProposalController);
	}
}
