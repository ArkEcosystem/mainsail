import { dirSync, setGracefulCleanup } from "tmp";

import appJson from "../../../core/bin/config/testnet/mainsail/app.json";
import { describe } from "../../../test-framework";
import { AppGenerator } from "./app";
import { makeApplication } from "../application-factory";

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
