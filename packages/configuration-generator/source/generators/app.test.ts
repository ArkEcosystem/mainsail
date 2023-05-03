import { dirSync, setGracefulCleanup } from "tmp";

import appJson from "../../../core/bin/config/testnet/app.json";
import { describe } from "../../../core-test-framework/distribution";
import { AppGenerator } from "./app";

describe<{
	dataPath: string;
	appGenerator: AppGenerator;
}>("AppGenerator", ({ it, assert, beforeEach, beforeAll }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach((context) => {
		context.dataPath = dirSync().name;
		context.appGenerator = new AppGenerator();
	});

	it("#generateDefault - should default data", ({ appGenerator }) => {
		assert.equal(appGenerator.generateDefault(), appJson);
	});
});
