import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Seeds } from "./seeds";

describe<{
	seeds: Seeds;
	app: Application;
}>("Seeds", ({ it, assert, beforeEach, stub }) => {
	beforeEach((context) => {
		// The application binds itself as Application.Instance; its config and terminate are stubbed per test.
		context.app = new Application();
		context.app.bind(Identifiers.P2P.Logger).toConstantValue({ debug: () => {} });

		context.seeds = context.app.resolve(Seeds);
	});

	it("#load - should read the list from the configuration", async ({ seeds, app }) => {
		stub(app, "config").returnValue({ list: [{ ip: "178.165.55.55", port: 4000 }], sources: [] });

		await seeds.load();

		assert.equal(seeds.all(), ["178.165.55.55"]);
		assert.true(seeds.isSeed("178.165.55.55"));
		assert.false(seeds.isSeed("178.165.55.56"));
	});

	it("#load - should sanitize the addresses and drop invalid ones", async ({ seeds, app }) => {
		stub(app, "config").returnValue({
			list: [
				{ ip: "::ffff:178.165.55.55", port: 4000 },
				{ ip: "not-an-ip", port: 4000 },
			],
		});

		await seeds.load();

		assert.equal(seeds.all(), ["178.165.55.55"]);
	});

	it("#load - should terminate the application when there are no seeds", async ({ seeds, app }) => {
		stub(app, "config").returnValue({ list: [] });
		const terminate = stub(app, "terminate").resolvedValue();

		await seeds.load();

		terminate.calledWith("No seed peers defined in peers.json");
	});
});
