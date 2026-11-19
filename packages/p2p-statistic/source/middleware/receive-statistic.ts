import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

// Times every request a peer sends us, from the decoded request to the encoded response. A request the
// transport refuses before that (unknown path, over a limit, undecodable) does not get here. Without an
// encoded response the request failed.
@injectable()
export class StatisticReceiveMiddleware implements Interfaces.ReceiveMiddleware {
	@inject(Identifiers.P2P.Statistic.Service)
	private readonly statisticService!: Contracts.P2PStatistic.Service;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	readonly #started = new WeakMap<Interfaces.ReceiveContext, number>();

	public async before(context: Interfaces.ReceiveContext): Promise<void> {
		this.#started.set(context, performance.now());
	}

	public async finally(context: Interfaces.ReceiveContext): Promise<void> {
		const started = this.#started.get(context);
		if (started === undefined) {
			return;
		}

		// A failure of the statistics must not fail the request it measures.
		try {
			this.statisticService
				.getCurrentRoundStatistic()
				.addPing(context.connection.remoteAddress, context.route.path, {
					responseTime: Math.round(performance.now() - started),
					success: context.response.payload !== undefined,
				});
		} catch (rawError) {
			this.logger.debug(`Recording a request in the statistics failed: ${ensureError(rawError).message}`, "p2p");
		}
	}
}
