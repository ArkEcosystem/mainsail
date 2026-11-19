import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, optional } from "@mainsail/container";

import { Controller } from "./controller.js";

// The statistics come from a plugin a node may leave out. Without it this API still starts and has no
// rounds to show.
@injectable()
export class StatisticController extends Controller {
	@inject(Identifiers.P2P.Statistic.Service)
	@optional()
	private readonly statisticService?: Contracts.P2P.StatisticService;

	public async index(
		request: Types.HapiRequest,
	): Promise<{ round: string; general: Contracts.P2P.GeneralStatistic }[]> {
		const statisticService = this.statisticService;
		if (!statisticService) {
			return [];
		}

		return statisticService.getRoundStatisticList().map((id) => {
			const statistic = statisticService.getRoundStatistic(id)!;
			return {
				round: `${statistic.height}-${statistic.round}`,
				// eslint-disable-next-line perfectionist/sort-objects
				general: statistic.getGeneralStatistic(),
			};
		});
	}

	public async list(request: Types.HapiRequest): Promise<string[]> {
		return this.statisticService?.getRoundStatisticList() ?? [];
	}

	public async show(request: Types.HapiRequest): Promise<object> {
		const { id } = request.params as { id: string };
		const statistic = this.statisticService?.getRoundStatistic(id);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line perfectionist/sort-objects
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line perfectionist/sort-objects
			emits: statistic.getEmitStatistics(),
			round: `${statistic.height}-${statistic.round}`,
			// eslint-disable-next-line perfectionist/sort-objects
			peers: statistic.getPeerStatistics(),
		};
	}

	public async latest(request: Types.HapiRequest): Promise<object> {
		const list = this.statisticService?.getRoundStatisticList() ?? [];
		if (list.length === 0) {
			return Boom.notFound("No statistics available");
		}

		const statistic = this.statisticService?.getRoundStatistic(list[0]);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line perfectionist/sort-objects
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line perfectionist/sort-objects
			emits: statistic.getEmitStatistics(),
			round: `${statistic.height}-${statistic.round}`,
			// eslint-disable-next-line perfectionist/sort-objects
			peers: statistic.getPeerStatistics(),
		};
	}
}
