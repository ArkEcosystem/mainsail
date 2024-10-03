import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework/source";
import { Store } from "./store";

describe<{
	sandbox: Sandbox;
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

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({
			getRequired: () => false, //snapshots.skipUnknownAttributes
		});

		context.store = context.sandbox.app.resolve(Store);
	});

	it("#initialize - should set height and totalRound", ({ store }) => {
		assert.equal(store.getHeight(), 0);
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
