import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class StatisticController extends Controller {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly staticService!: Contracts.P2P.StatisticService;

	public async index(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<{ round: string; general: Contracts.P2P.GeneralStatistic }[]> {
		return this.staticService.getRoundStatisticList().map((id) => {
			const statistic = this.staticService.getRoundStatistic(id)!;
			return {
				round: `${statistic.height}-${statistic.round}`,
				// eslint-disable-next-line sort-keys-fix/sort-keys-fix
				general: statistic.getGeneralStatistic(),
			};
		});
	}

	public async list(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<string[]> {
		return this.staticService.getRoundStatisticList();
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<object> {
		const { id } = request.params as { id: string };
		const statistic = this.staticService.getRoundStatistic(id);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			round: `${statistic.height}-${statistic.round}`,
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			emits: statistic.getEmitStatistics(),
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			peers: statistic.getPeerStatistics(),
		};
	}

	public async latest(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<object> {
		const list = this.staticService.getRoundStatisticList();
		if (list.length === 0) {
			return Boom.notFound("No statistics available");
		}

		const statistic = this.staticService.getRoundStatistic(list[0]);

		if (!statistic) {
			return Boom.notFound("Statistic not found");
		}

		return {
			round: `${statistic.height}-${statistic.round}`,
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			general: statistic.getGeneralStatistic(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			emits: statistic.getEmitStatistics(),
			pings: statistic.getPingStatistics(),
			// eslint-disable-next-line sort-keys-fix/sort-keys-fix
			peers: statistic.getPeerStatistics(),
		};
	}
}
