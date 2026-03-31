import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class StatisticController extends Controller {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly staticService!: Contracts.P2P.StatisticService;

	public async index(
		request: Types.HapiRequest,
	): Promise<{ round: string; general: Contracts.P2P.GeneralStatistic }[]> {
		return this.staticService.getRoundStatisticList().map((id) => {
			const statistic = this.staticService.getRoundStatistic(id)!;
			return {
				round: `${statistic.height}-${statistic.round}`,
				// eslint-disable-next-line perfectionist/sort-objects
				general: statistic.getGeneralStatistic(),
			};
		});
	}

	public async list(request: Types.HapiRequest): Promise<string[]> {
		return this.staticService.getRoundStatisticList();
	}

	public async show(request: Types.HapiRequest): Promise<object> {
		const { id } = request.params as { id: string };
		const statistic = this.staticService.getRoundStatistic(id);

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
		const list = this.staticService.getRoundStatisticList();
		if (list.length === 0) {
			return Boom.notFound("No statistics available");
		}

		const statistic = this.staticService.getRoundStatistic(list[0]);

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
