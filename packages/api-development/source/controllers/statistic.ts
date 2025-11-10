import Boom from "@hapi/boom";
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

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const { id } = request.params as { id: string };
		const statistic = this.staticService.getRoundStatistic(id);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			emits: statistic.getEmitStatistics(),
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			peers: statistic.getPeerStatistics(),
		};
	}

	public async latest(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const list = this.staticService.getRoundStatisticList();
		if (list.length === 0) {
			return Boom.notFound("No statistics available");
		}

		const statistic = this.staticService.getRoundStatistic(list[0]);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			emits: statistic.getEmitStatistics(),
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			peers: statistic.getPeerStatistics(),
		};
	}
}
