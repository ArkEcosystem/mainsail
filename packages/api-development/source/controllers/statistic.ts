import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class StatisticController extends Controller {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly staticService!: Contracts.P2P.StatisticService;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		return this.staticService.getRoundStatisticList();
	}
}
