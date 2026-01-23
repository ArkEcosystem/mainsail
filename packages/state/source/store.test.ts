import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
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
			notice: () => { },
		};

		context.eventDispatcher = {
			dispatch: () => { },
		};

		context.cryptoConfiguration = {
			getMilestoneDiff: () => ({}),
			isNewMilestone: () => false,
			setHeight: () => { },
		};

		context.app = new Application(new Container());

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({
			getRequired: () => false, //snapshots.skipUnknownAttributes
		});

		context.store = context.app.resolve(Store);
	});

	it("#initialize - should set height and totalRound", ({ store }) => {
		assert.equal(store.getBlockNumber(), 0);
		assert.equal(store.getTotalRound(), 0);
	});

	it("#getLastBlock - should throw if not set", ({ store }) => {
		assert.throws(() => store.getLastBlock());
	});

	it("#setLastBlock - should be ok", ({ store, cryptoConfiguration }) => {
		const block = {
			data: {
				height: 1,
			},
		};
		store.setLastBlock(block as any);
	});
});
