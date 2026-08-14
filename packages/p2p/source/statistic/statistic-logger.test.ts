import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "../defaults";
import { StatisticLogger } from "./statistic-logger";

describe<{
	app: Application;
	messages: string[];
	statisticLogger: StatisticLogger;
}>("StatisticLogger", ({ it, assert, beforeEach }) => {
	const roundStatistic = (count: Partial<Contracts.P2P.GeneralStatistic["count"]>) =>
		({
			getGeneralStatistic: (): Contracts.P2P.GeneralStatistic => ({
				count: {
					emitsFailed: 0,
					emitsSuccess: 0,
					peersBanned: 0,
					peersDropped: 0,
					peersRound: 0,
					peersTotal: 0,
					pingsFailed: 0,
					pingsSuccess: 0,
					recordsUnattributed: 0,
					...count,
				},
				duration: 0,
				peers: { added: [], banned: [], removed: [] },
				response: { average: 0 },
			}),
		}) as unknown as Contracts.P2P.RoundStatistic;

	beforeEach((context) => {
		context.messages = [];

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTagged("plugin", "p2p");
		context.app.bind(Identifiers.P2P.Logger).toConstantValue({
			info: (message: string) => context.messages.push(message),
		});

		context.statisticLogger = context.app.resolve(StatisticLogger);
	});

	it("should report unattributed records without discounting them from the totals", ({
		messages,
		statisticLogger,
	}) => {
		statisticLogger.log(roundStatistic({ pingsSuccess: 1000, recordsUnattributed: 500 }));

		// The 500 are missing from the per-peer breakdown only; they are still counted as pings.
		assert.true(messages[0].includes("pings=1000/1000"));
		assert.true(messages[0].includes("unattributed=500"));
	});

	it("should omit the unattributed count when everything was attributed", ({ messages, statisticLogger }) => {
		statisticLogger.log(roundStatistic({ pingsSuccess: 1000 }));

		assert.false(messages[0].includes("unattributed="));
	});
});
