import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { performance } from "perf_hooks";

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
				const duration = Math.round(performance.now() - request.start);
				this.statisticService
					.getCurrentRoundStatistic()
					.addPing(request.info.remoteAddress, request.path.slice(1), {
						responseTime: duration,
						success: !request.response.isBoom,
					});

				return h.continue;
			},
			type: "onPreResponse",
		});
	}
}
