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
}>("Service", ({ it, assert, beforeEach, spy, clock }) => {
	const MAX_TRACKED_ROUNDS = 5;
	const BLOCK_TIME = 8000;

	beforeEach((context) => {
		context.listeners = new Map();
		context.statisticLogger = { log: () => {} };
		context.logger = { warn: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(
				new Providers.PluginConfiguration().from("", { ...defaults, maxTrackedRounds: MAX_TRACKED_ROUNDS }),
			)
			.whenTagged("plugin", "p2p-statistic");
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getActivePeers: () => [] });
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({ bannedPeers: () => [] });
		app.bind(Identifiers.P2P.Statistic.Logger).toConstantValue(context.statisticLogger);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => ({ timeouts: { blockTime: BLOCK_TIME } }),
		});
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			forget: (name: string) => context.listeners.delete(name),
			listen: (name: string, listener: any) => context.listeners.set(name, listener),
		});

		context.statisticService = app.resolve(Service);
	});

	const fire = async (listeners: Map<string, any>, name: string, data: unknown): Promise<void> =>
		listeners.get(name).handle({ data, name });

	it("#boot - should log the finished round and keep the statistic of the new one", async ({
		statisticService,
		statisticLogger,
		listeners,
	}) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const log = spy(statisticLogger, "log");
		statisticService.boot();
		const first = statisticService.getCurrentRoundStatistic();

		fakeTimers.tick(BLOCK_TIME);
		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 5, round: 1 });

		log.calledWith(first);
		const current = statisticService.getCurrentRoundStatistic();
		assert.not.equal(current === first, true);
		assert.equal([current.height, current.round], [5, 1]);
		assert.equal(statisticService.getRoundStatistic("5-1"), current);
		assert.equal(statisticService.getRoundStatisticList(), ["5-1"]);
	});

	it("#boot - should not log the rounds of downloaded blocks, which take a moment each", async ({
		statisticService,
		statisticLogger,
		listeners,
	}) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const log = spy(statisticLogger, "log");
		statisticService.boot();

		// Blocks applied one after another during a sync.
		for (let blockNumber = 1; blockNumber <= 3; blockNumber++) {
			fakeTimers.tick(20);
			await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber, round: 0 });
		}
		log.neverCalled();

		// They are counted and kept like any other round.
		assert.equal(statisticService.getRoundStatisticList(), ["3-0", "2-0", "1-0"]);

		// A small part of a block time is still too short, a whole block time is a live round.
		fakeTimers.tick(BLOCK_TIME / 10);
		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 4, round: 0 });
		log.neverCalled();

		fakeTimers.tick(BLOCK_TIME);
		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 4, round: 1 });
		log.calledOnce();
	});

	it("#boot - should keep as many rounds as configured, newest first", async ({ statisticService, listeners }) => {
		statisticService.boot();

		for (let blockNumber = 1; blockNumber <= MAX_TRACKED_ROUNDS + 2; blockNumber++) {
			await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber, round: 0 });
		}

		const list = statisticService.getRoundStatisticList();

		assert.length(list, MAX_TRACKED_ROUNDS);
		assert.equal(list[0], `${MAX_TRACKED_ROUNDS + 2}-0`);
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
		const fakeTimers = clock({ toFake: ["performance"] });
		statisticService.boot();
		statisticLogger.log = () => {
			throw new Error("boom");
		};
		const warn = spy(logger, "warn");

		// Consensus awaits the listeners of this event: a rejection would fail its round.
		fakeTimers.tick(BLOCK_TIME);
		await fire(listeners, Events.ConsensusEvent.RoundStarted, { blockNumber: 7, round: 2 });

		warn.calledWith(`Recording ${Events.ConsensusEvent.RoundStarted} in the statistics failed: boom`, "p2p");

		// The round is counted on its own all the same, not added to the one that could not be logged.
		const current = statisticService.getCurrentRoundStatistic();
		assert.equal([current.height, current.round], [7, 2]);
		assert.equal(statisticService.getRoundStatisticList(), ["7-2"]);
	});

	it("#dispose - should stop listening", ({ statisticService, listeners }) => {
		statisticService.boot();
		assert.equal(listeners.size, 4);

		statisticService.dispose();

		assert.equal(listeners.size, 0);
	});
});
