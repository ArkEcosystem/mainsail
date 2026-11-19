import { Events, Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults";
import { Service } from "./service";

describe<{
	statisticService: Service;
	statisticLogger: any;
	logger: any;
	listeners: Map<string, any>;
}>("Service", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.listeners = new Map();
		context.statisticLogger = { log: () => {} };
		context.logger = { warn: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTagged("plugin", "p2p-statistic");
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getActivePeers: () => [] });
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({ bannedPeers: () => [] });
		app.bind(Identifiers.P2P.Statistic.Logger).toConstantValue(context.statisticLogger);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			forget: (name: string) => context.listeners.delete(name),
			listen: (name: string, listener: any) => context.listeners.set(name, listener),
		});

		context.statisticService = app.resolve(Service);
	});

	const fire = async (listeners: Map<string, any>, name: string, data: unknown): Promise<void> =>
		listeners.get(name).handle({ data, name });

	it("#newRound - should log the finished round and start a statistic for the new one", ({
		statisticService,
		statisticLogger,
	}) => {
		const log = spy(statisticLogger, "log");
		statisticService.boot();
		const first = statisticService.getCurrentRoundStatistic();

		statisticService.newRound(5, 1);

		log.calledWith(first);
		const current = statisticService.getCurrentRoundStatistic();
		assert.not.equal(current === first, true);
		assert.equal([current.height, current.round], [5, 1]);
		assert.equal(statisticService.getRoundStatistic("5-1"), current);
		assert.equal(statisticService.getRoundStatisticList(), ["5-1"]);
	});

	it("#newRound - should keep the last 100 rounds, newest first", ({ statisticService }) => {
		statisticService.boot();

		for (let height = 1; height <= 102; height++) {
			statisticService.newRound(height, 0);
		}

		const list = statisticService.getRoundStatisticList();

		assert.length(list, 100);
		assert.equal(list[0], "102-0");
		assert.equal(list.at(-1), "3-0");
		assert.undefined(statisticService.getRoundStatistic("2-0"));
	});

	it("#boot - should start a new statistic with every consensus round", async ({ statisticService, listeners }) => {
		statisticService.boot();

		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 7, round: 2 });

		const current = statisticService.getCurrentRoundStatistic();
		assert.equal([current.height, current.round], [7, 2]);
	});

	it("#boot - should record peers that are added, removed and banned", async ({ statisticService, listeners }) => {
		statisticService.boot();

		await fire(listeners, Events.PeerEvent.Added, { ip: "1.1.1.1" });
		await fire(listeners, Events.PeerEvent.Removed, { ip: "2.2.2.2" });
		// A ban carries the peer's data; the removal that follows it for an active peer is not counted twice.
		await fire(listeners, Events.PeerEvent.Banned, { peer: { ip: "3.3.3.3" }, reason: "bad block", until: 1 });
		await fire(listeners, Events.PeerEvent.Removed, { ip: "3.3.3.3" });

		assert.equal(statisticService.getCurrentRoundStatistic().getGeneralStatistic().peers, {
			added: ["1.1.1.1"],
			banned: ["3.3.3.3"],
			removed: ["2.2.2.2"],
		});
	});

	it("#boot - should keep a failure of the statistics away from the dispatcher", async ({
		statisticService,
		statisticLogger,
		logger,
		listeners,
	}) => {
		statisticService.boot();
		statisticLogger.log = () => {
			throw new Error("boom");
		};
		const warn = spy(logger, "warn");

		// Consensus awaits the listeners of this event: a rejection would fail its round.
		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 7, round: 2 });

		warn.calledWith(`Recording ${Events.ConsensusEvent.RoundStarted} in the statistics failed: boom`, "p2p");
	});

	it("#dispose - should stop listening", ({ statisticService, listeners }) => {
		statisticService.boot();
		assert.equal(listeners.size, 4);

		statisticService.dispose();

		assert.equal(listeners.size, 0);
	});
});
