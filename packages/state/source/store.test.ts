import { Identifiers, Events } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Store } from "./store";

describe<{
	app: Application;
	store: Store;
	logger: any;
	eventDispatcher: any;
	cryptoConfiguration: any;
}>("Store", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach(async (context) => {
		context.logger = {
			notice: () => {},
		};

		context.eventDispatcher = {
			dispatch: () => {},
		};

		context.cryptoConfiguration = {
			getMilestoneDiff: () => ({}),
			isNewMilestone: () => false,
			setHeight: () => {},
		};

		context.app = new Application();

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);

		context.store = context.app.resolve(Store);
	});

	it("should set height and totalRound by default", ({ store }) => {
		assert.equal(store.getBlockNumber(), 0);
		assert.equal(store.getTotalRound(), 0);
	});

	it("#getGenesisCommit  should throw if genesis commit is not set", ({ store }) => {
		assert.throws(() => store.getGenesisCommit());
	});

	it("#setGenesisCommit  should set genesis commit", ({ store }) => {
		const genesisCommit: any = {
			block: {
				data: {
					height: 0,
				},
			},
		};

		store.setGenesisCommit(genesisCommit);

		assert.equal(store.getGenesisCommit(), genesisCommit);
	});

	it("#setBlockNumber - should not log and dispatch milestone change if it is worker", ({
		app,
		store,
		cryptoConfiguration,
		logger,
		eventDispatcher,
	}) => {
		const spyConfigurationSetHeight = spy(cryptoConfiguration, "setHeight");
		const spyConfigurationIsNewMilestone = stub(cryptoConfiguration, "isNewMilestone").returnValue(true);
		const spyAppIsWorker = stub(app, "isWorker").returnValue(true);
		const spyLoggerNotice = spy(logger, "notice");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		store.setBlockNumber(1);

		assert.equal(store.getBlockNumber(), 1);
		spyConfigurationSetHeight.calledOnce();
		spyConfigurationSetHeight.calledWith(2);
		spyConfigurationIsNewMilestone.calledOnce();
		spyAppIsWorker.calledOnce();

		spyLoggerNotice.neverCalled();
		spyDispatch.neverCalled();
	});

	it("#setBlockNumber - should log and dispatch milestone change if it is not worker", ({
		app,
		store,
		cryptoConfiguration,
		logger,
		eventDispatcher,
	}) => {
		const spyConfigurationSetHeight = spy(cryptoConfiguration, "setHeight");
		const spyConfigurationIsNewMilestone = stub(cryptoConfiguration, "isNewMilestone").returnValue(true);
		const spyAppIsWorker = stub(app, "isWorker").returnValue(false);
		const spyLoggerNotice = spy(logger, "notice");
		const spyDispatch = spy(eventDispatcher, "dispatch");

		store.setBlockNumber(1);

		assert.equal(store.getBlockNumber(), 1);
		spyConfigurationSetHeight.calledOnce();
		spyConfigurationSetHeight.calledWith(2);
		spyConfigurationIsNewMilestone.calledOnce();
		spyAppIsWorker.calledOnce();

		spyLoggerNotice.calledOnce();
		spyDispatch.calledOnce();
		spyDispatch.calledWith(Events.CryptoEvent.MilestoneChanged);
	});

	it("#getLastBlock - should throw if not set", ({ store }) => {
		assert.throws(() => store.getLastBlock());
	});

	it("#setLastBlock - should be ok", ({ store, cryptoConfiguration }) => {
		const spyConfigurationSetHeight = spy(cryptoConfiguration, "setHeight");

		const block: any = {
			data: {
				number: 1,
			},
		};
		store.setLastBlock(block);

		assert.equal(store.getLastBlock(), block);
		assert.equal(store.getBlockNumber(), 1);

		spyConfigurationSetHeight.calledOnce();
		spyConfigurationSetHeight.calledWith(2);
	});

	it("#setTotalRound - should set total round", ({ store }) => {
		assert.equal(store.getTotalRound(), 0);

		store.setTotalRound(2);

		assert.equal(store.getTotalRound(), 2);
	});

	it("#onCommit - should set total round and last block", ({ store }) => {
		const block = {
			data: {
				number: 0,
			},
		};

		const unit: any = {
			getBlock: () => block,
			round: 0,
		};

		store.onCommit(unit);

		assert.equal(store.getLastBlock(), block);
		assert.equal(store.getTotalRound(), 1);
	});
});
