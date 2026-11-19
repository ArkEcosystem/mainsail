import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { StatisticReceiveMiddleware, StatisticSendMiddleware } from "./middleware/index.js";
import { StatisticLogger } from "./statistic-logger.js";
import { StatisticService } from "./statistic-service.js";

// Per-round statistics of the peer layer: request timings and peers coming and going, for the log and
// the development API. Nothing in consensus or sync reads them, so a node may leave this plugin out.
// It adds a step to the transport's middleware and listens to the events of the peer layer and of
// consensus; neither package knows about it.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.P2P.Statistic.Logger).to(StatisticLogger).inSingletonScope();
		this.app.bind(Identifiers.P2P.Statistic.Service).to(StatisticService).inSingletonScope();

		this.app.bind(Identifiers.P2P.WebSocket.SendMiddleware).to(StatisticSendMiddleware).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.ReceiveMiddleware).to(StatisticReceiveMiddleware).inSingletonScope();
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.P2PStatistic.StatisticService>(Identifiers.P2P.Statistic.Service).boot();
	}

	public async dispose(): Promise<void> {
		this.app.get<Contracts.P2PStatistic.StatisticService>(Identifiers.P2P.Statistic.Service).dispose();
	}

	// Mirrors defaults.ts.
	public configSchema(): Joi.AnySchema {
		return Joi.object({
			maxTrackedPeers: Joi.number().integer().min(1).required(),
			verbosity: Joi.number().integer().min(0).max(3).required(),
		}).unknown(true);
	}
}
