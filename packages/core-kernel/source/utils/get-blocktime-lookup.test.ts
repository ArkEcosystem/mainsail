import { Interfaces, Managers, Networks } from "@arkecosystem/crypto";

import { describe } from "../../../core-test-framework";
import { getBlockTimeLookup } from "./get-blocktime-lookup";

const milestones = [
	{ height: 1, blocktime: 5 },
	{ height: 3, blocktime: 4 },
	{ height: 5, blocktime: 6 },
];

describe<{
	mockApp: any;
	config: Interfaces.NetworkConfig;
}>("getBlockTimeLookup", ({ afterEach, assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.config = Managers.configManager.all();

		context.mockApp = {
			get: () => ({
				findBlockByHeights: async (heights: Array<number>): Promise<Array<any>> => {
					const result = [{ timestamp: 0 }];
					switch (heights[0]) {
						case 2:
							result[0].timestamp = 5;
							return result;
						case 4:
							result[0].timestamp = 14;
							return result;
						default:
							throw new Error(`Test scenarios should not hit this line`);
					}
				},
			}),
		};

		const config = { ...Networks.devnet, milestones };
		Managers.configManager.setConfig(config);
	});

	afterEach((context) => {
		Managers.configManager.setConfig(context.config);
	});

	it("should return a method to lookup blockTimestamps via a given height", async (context) => {
		assert.function(await getBlockTimeLookup(context.mockApp, 1));
		assert.function(await getBlockTimeLookup(context.mockApp, 2));
		assert.function(await getBlockTimeLookup(context.mockApp, 3));
		assert.function(await getBlockTimeLookup(context.mockApp, 4));
		assert.function(await getBlockTimeLookup(context.mockApp, 5));
		assert.function(await getBlockTimeLookup(context.mockApp, 6));
	});

	it("should return a function that retrieves correct values when searching a height before a milestone change", async (context) => {
		const lookupResultOne = await getBlockTimeLookup(context.mockApp, 1);
		const lookupResultTwo = await getBlockTimeLookup(context.mockApp, 3);
		const lookupResultThree = await getBlockTimeLookup(context.mockApp, 5);

		assert.equal(lookupResultOne(1), 0);
		assert.equal(lookupResultTwo(2), 5);
		assert.equal(lookupResultThree(4), 14);
	});

	it("returned function should be able to look up any height before any milestone below current height", async (context) => {
		const lookupResultOne = await getBlockTimeLookup(context.mockApp, 1);
		const lookupResultTwo = await getBlockTimeLookup(context.mockApp, 3);
		const lookupResultThree = await getBlockTimeLookup(context.mockApp, 5);

		assert.equal(lookupResultOne(1), 0);

		assert.equal(lookupResultTwo(1), 0);
		assert.equal(lookupResultTwo(2), 5);

		assert.equal(lookupResultThree(1), 0);
		assert.equal(lookupResultThree(2), 5);
		assert.equal(lookupResultThree(4), 14);
	});

	it("returned function should throw when not looking up a block before a milestone change", async (context) => {
		const lookupResultOne = await getBlockTimeLookup(context.mockApp, 1);
		const lookupResultTwo = await getBlockTimeLookup(context.mockApp, 3);
		const lookupResultThree = await getBlockTimeLookup(context.mockApp, 5);

		const generateErrorMessage = (height: number) =>
			`Attempted lookup of block height ${height} for milestone span calculation, but none exists.`;

		await assert.rejects(() => lookupResultOne(3), generateErrorMessage(3));
		await assert.rejects(() => lookupResultTwo(5), generateErrorMessage(5));
		await assert.rejects(() => lookupResultTwo(6), generateErrorMessage(6));
		await assert.rejects(() => lookupResultThree(6), generateErrorMessage(6));
	});
});
