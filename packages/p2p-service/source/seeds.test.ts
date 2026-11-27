import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Seeds } from "./seeds";

describe<{
	seeds: Seeds;
	app: Application;
	logger: any;
}>("Seeds", ({ it, assert, beforeEach, spy, stub }) => {
	beforeEach((context) => {
		// The application binds itself as Application.Instance; its config and terminate are stubbed per test.
		context.app = new Application();
		context.logger = { debug: () => {}, warn: () => {} };
		context.app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

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

	it("#load - should add the seeds of a source without changing the configured list", async ({ seeds, app }) => {
		const source = join(mkdtempSync(join(tmpdir(), "seeds-")), "peers.json");
		writeFileSync(source, JSON.stringify([{ ip: "178.165.55.56", port: 4000 }]));

		const list = [{ ip: "178.165.55.55", port: 4000 }];
		stub(app, "config").returnValue({ list, sources: [source] });

		await seeds.load();

		assert.equal(seeds.all(), ["178.165.55.55", "178.165.55.56"]);
		assert.equal(list, [{ ip: "178.165.55.55", port: 4000 }]);
	});

	it("#load - should log a source that fails and keep the configured list", async ({ seeds, app, logger }) => {
		stub(app, "config").returnValue({
			list: [{ ip: "178.165.55.55", port: 4000 }],
			sources: ["/nonexistent/peers.json"],
		});
		const warn = spy(logger, "warn");

		await seeds.load();

		warn.calledOnce();
		assert.true(warn.getCallArgs(0)[0].startsWith("Failed to load the seed peers from a source: "));
		assert.equal(seeds.all(), ["178.165.55.55"]);
	});

	it("#load - should terminate the application when there are no seeds", async ({ seeds, app }) => {
		stub(app, "config").returnValue({ list: [] });
		const terminate = stub(app, "terminate").resolvedValue();

		await seeds.load();

		terminate.calledWith("No seed peers defined in peers.json");
	});
});
