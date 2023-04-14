import { SinonSpyStatic } from "sinon";
import { Utils } from "@arkecosystem/core-kernel";
import { Wallets } from "@arkecosystem/core-state";
import { Crypto, Managers } from "@arkecosystem/crypto";
import { describe } from "../../core-test-framework/source";

import { DelegateTracker } from "./delegate-tracker";
import { BIP39 } from "./methods/bip39";
import { calculateActiveDelegates } from "../test/calculate-active-delegates";
import { dummy } from "../test/create-block-with-transactions";
import { mockLastBlock, setup } from "../test/setup";

describe<{
	delegateTracker: DelegateTracker;
	loggerDebug: SinonSpyStatic;
	loggerWarning: SinonSpyStatic;
	activeDelegates: any[];
}>("DelegateTracker", ({ assert, beforeEach, it, stub }) => {
	beforeEach(async (context) => {
		context.activeDelegates = calculateActiveDelegates();
		const initialEnv = await setup(context.activeDelegates);
		context.delegateTracker = initialEnv.sandbox.app.resolve<DelegateTracker>(DelegateTracker);
		context.loggerDebug = initialEnv.spies.logger.debug;
		context.loggerWarning = initialEnv.spies.logger.warning;
	});

	it("initialise should set-up delegates", async (context) => {
		const delegate = new BIP39(dummy.plainPassphrase);

		context.delegateTracker.initialize([delegate]);
		assert.equal((context.delegateTracker as any).delegates, [delegate]);
	});

	it("handle should handle and compute next forgers", async (context) => {
		context.delegateTracker.initialize(context.activeDelegates);
		await assert.resolves(() => context.delegateTracker.handle());
	});

	it("handle should log the next forgers and time to next round", async (context) => {
		context.delegateTracker.initialize([context.activeDelegates[0]]);

		stub(Crypto.Slots, "getSlotNumber").returnValueOnce(0);
		await context.delegateTracker.handle();

		const height = mockLastBlock.data.height;
		const delegatesCount = Managers.configManager.getMilestone(height).activeDelegates;
		const blockTime: number = Managers.configManager.getMilestone(height).blocktime;

		const secondsToNextRound = (delegatesCount - (height % delegatesCount)) * blockTime;

		assert.true(
			context.loggerDebug.calledWith(
				`Next Forgers: ${JSON.stringify(
					context.activeDelegates.slice(2, 7).map((delegate: Wallets.Wallet) => delegate.getPublicKey()),
				)}`,
			),
		);

		assert.true(
			context.loggerDebug.calledWith(`Round 1 will end in ${Utils.prettyTime(secondsToNextRound * 1000)}.`),
		);
	});

	it("handle should log the next forger when it's time to forge", async (context) => {
		stub(Crypto.Slots, "getSlotNumber").returnValueOnce(0);
		const mockMileStoneData = {
			blocktime: 0,
			activeDelegates: 51,
		};
		Managers.configManager.set("milestone", mockMileStoneData);

		context.delegateTracker.initialize(context.activeDelegates);
		await context.delegateTracker.handle();

		const nextToForge = context.activeDelegates[2];
		assert.true(context.loggerDebug.calledWith(`${nextToForge.publicKey} will forge next.`));
	});

	it("handle should log the next forger and the time when it will forge", async (context) => {
		stub(Crypto.Slots, "getSlotNumber").returnValueOnce(0);

		const blockTime = 8;
		context.delegateTracker.initialize(context.activeDelegates);
		await context.delegateTracker.handle();

		assert.equal(context.loggerDebug.callCount, 53);
		let secondsToForge = blockTime;
		for (let i = 0; i < context.activeDelegates.length; i++) {
			const nextToForge = context.activeDelegates[i];
			// mockLastBlock has height of 3
			if (i === 2) {
				assert.equal(context.loggerDebug.getCall(3).args[0], `${nextToForge.publicKey} will forge next.`);
			} else if (i < 2) {
				assert.equal(
					context.loggerDebug.getCall(i + 1).args[0],
					`${nextToForge.publicKey} has already forged.`,
				);
			} else {
				assert.equal(
					context.loggerDebug.getCall(i + 1).args[0],
					`${nextToForge.publicKey} will forge in ${Utils.prettyTime(secondsToForge * 1000)}.`,
				);
				secondsToForge += blockTime;
			}
		}
	});

	it("handle should log warning when there are less active delegates than the required delegate count", async (context) => {
		const mockMileStoneData = {
			blocktime: 2,
			activeDelegates: 80,
		};

		stub(Managers.configManager, "getMilestone").returnValue(mockMileStoneData);

		context.delegateTracker.initialize(context.activeDelegates);
		await context.delegateTracker.handle();

		assert.true(
			context.loggerWarning.calledWith(
				`Tracker only has ${context.activeDelegates.length} active delegates from a required ${mockMileStoneData.activeDelegates}`,
			),
		);
	});
});
