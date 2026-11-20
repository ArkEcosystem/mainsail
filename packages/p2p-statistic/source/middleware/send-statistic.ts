import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

// Times every request we send. Bound after the codec, so `after` runs only once the response is decoded:
// a request that got no answer, an error status or an unreadable response never reaches it and counts
// as failed.
@injectable()
export class StatisticSendMiddleware implements Interfaces.SendMiddleware {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly statisticService!: Contracts.P2PStatistic.Service;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	readonly #requests = new WeakMap<Interfaces.SendContext, { started: number; success: boolean }>();

	public async before(context: Interfaces.SendContext): Promise<void> {
		this.#requests.set(context, { started: performance.now(), success: false });
	}

	public async after(context: Interfaces.SendContext): Promise<void> {
		const request = this.#requests.get(context);
		if (request) {
			request.success = true;
		}
	}

	public async finally(context: Interfaces.SendContext): Promise<void> {
		const request = this.#requests.get(context);
		if (!request) {
			return;
		}

		// A failure of the statistics must not fail the request it measures.
		try {
			this.statisticService
				.getCurrentRoundStatistic()
				.addEmit(context.connection.remoteAddress, context.route.path, {
					responseTime: Math.round(performance.now() - request.started),
					success: request.success,
				});
		} catch (rawError) {
			this.logger.debug(`Recording a request in the statistics failed: ${ensureError(rawError).message}`, "p2p");
		}
	}
}
