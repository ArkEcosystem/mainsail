import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { RoundResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class RoundsController extends Controller {
	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

	public async delegates(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const delegates = await this.database.getRound(request.params.id);

		if (delegates.length === 0) {
			return notFound("Round not found");
		}

		return this.respondWithCollection(delegates, RoundResource);
	}
}
