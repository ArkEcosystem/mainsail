import { dirSync, setGracefulCleanup } from "tmp";

import appJson from "../../../core/bin/config/devnet/core/app.json";
import { describe } from "@mainsail/test-runner";
import { makeApplication } from "../application-factory";
import { AppGenerator } from "./app";

describe<{
	dataPath: string;
	appGenerator: AppGenerator;
}>("AppGenerator", ({ it, assert, stub, beforeEach, beforeAll }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach(async (context) => {
		const app = await makeApplication();

		context.dataPath = dirSync().name;
		context.appGenerator = app.resolve(AppGenerator);
	});

	it("#generateDefault - should default data", ({ appGenerator }) => {
		assert.equal(appGenerator.generateDefault(), appJson);
	});

	it("#generate - should return the default app.json when no snapshot is given", ({ appGenerator }) => {
		assert.equal(appGenerator.generate({} as any), appJson);
	});

	it("#generate - should not duplicate the importer when the template already includes it", ({ appGenerator }) => {
		const result = appGenerator.generate({ snapshot: { path: "x" } } as any);

		const importers = (result.main as { package: string }[]).filter(
			(plugin) => plugin.package === "@mainsail/snapshot-legacy-importer",
		);
		assert.equal(importers.length, 1);
	});

	it("#generate - should insert the importer before @mainsail/state when missing", ({ appGenerator }) => {
		stub(appGenerator, "generateDefault").returnValue({
			main: [{ package: "@mainsail/foo" }, { package: "@mainsail/state" }],
		} as any);

		const result = appGenerator.generate({ snapshot: { path: "x" } } as any);

		assert.equal(result.main, [
			{ package: "@mainsail/foo" },
			{ package: "@mainsail/snapshot-legacy-importer" },
			{ package: "@mainsail/state" },
		]);
	});

	it("#generate - should throw when @mainsail/state is missing from the template", ({ appGenerator }) => {
		stub(appGenerator, "generateDefault").returnValue({ main: [{ package: "@mainsail/foo" }] } as any);

		assert.throws(() => appGenerator.generate({ snapshot: { path: "x" } } as any), /"@mainsail\/state" not found/);
	});
});
