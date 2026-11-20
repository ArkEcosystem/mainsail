import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { StatisticController } from "./statistic";

describe<{
	app: Application;
}>("StatisticController", ({ it, beforeEach, assert }) => {
	const makeStatistic = (height: number, round: number) => ({
		getEmitStatistics: () => [],
		getGeneralStatistic: () => ({ duration: 10 }),
		getPeerStatistics: () => [],
		getPingStatistics: () => [],
		height,
		round,
	});

	const request = (id?: string) => ({ params: { id } }) as any;

	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
	});

	it("should have no rounds to show when the statistics are not loaded", async ({ app }) => {
		const controller = app.resolve(StatisticController);

		assert.equal(await controller.index(request()), []);
		assert.equal(await controller.list(request()), []);
		assert.equal(((await controller.show(request("5-0"))) as any).output.statusCode, 404);
		assert.equal(((await controller.latest(request())) as any).output.statusCode, 404);
	});

	it("should show the rounds of the statistics", async ({ app }) => {
		const statistics = { "5-0": makeStatistic(5, 0), "6-0": makeStatistic(6, 0) };
		app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({
			getRoundStatistic: (id: string) => statistics[id],
			getRoundStatisticList: () => ["6-0", "5-0"],
		});
		const controller = app.resolve(StatisticController);

		assert.equal(await controller.list(request()), ["6-0", "5-0"]);
		assert.equal(await controller.index(request()), [
			{ general: { duration: 10 }, round: "6-0" },
			{ general: { duration: 10 }, round: "5-0" },
		]);
		assert.equal(((await controller.show(request("5-0"))) as any).round, "5-0");
		assert.equal(((await controller.latest(request())) as any).round, "6-0");
		assert.equal(((await controller.show(request("1-0"))) as any).output.statusCode, 404);
	});
});
