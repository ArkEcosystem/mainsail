import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { performance } from "perf_hooks";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/typedef */

@injectable()
export class StatisticPlugin {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly statisticService!: Contracts.P2P.StatisticService;

	public register(server) {
		server.ext({
			method: async (request, h) => {
				request.start = performance.now();
				return h.continue;
			},
			type: "onRequest",
		});

		server.ext({
			method: async (request, h) => {
				const endpoint = request.route.settings.id;
				if (endpoint === undefined) {
					return h.continue;
				}

				const duration = Math.round(performance.now() - request.start);
				this.statisticService.getCurrentRoundStatistic().addPing(request.info.remoteAddress, endpoint, {
					responseTime: duration,
					success: !request.response.isBoom,
				});

				return h.continue;
			},
			type: "onPreResponse",
		});
	}
}
