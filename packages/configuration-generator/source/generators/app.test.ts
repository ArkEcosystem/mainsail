import { dirSync, setGracefulCleanup } from "tmp";

import appJson from "../../../core/bin/config/testnet/core/app.json";
import { describe } from "../../../test-framework/source";
import { makeApplication } from "../application-factory";
import { AppGenerator } from "./app";

describe<{
	dataPath: string;
	appGenerator: AppGenerator;
}>("AppGenerator", ({ it, assert, beforeEach, beforeAll }) => {
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
});
