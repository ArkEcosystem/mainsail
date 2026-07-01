import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { EnvironmentGenerator } from "./environment";

describe<{
	dataPath: string;
	generator: EnvironmentGenerator;
}>("EnvironmentGenerator", ({ it, assert, beforeEach, beforeAll }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach((context) => {
		context.dataPath = dirSync().name;
		context.generator = new EnvironmentGenerator();
	});

	it("#generate - should return generated data", ({ generator }) => {
		assert.object(generator.generate());
	});

	it("#addInitialRecords - should add initial records", ({ generator }) => {
		const resul = generator.addInitialRecords().generate();

		assert.equal(resul.MAINSAIL_LOG_LEVEL, "info");
		assert.equal(resul.MAINSAIL_LOG_LEVEL_FILE, "info");
		assert.equal(resul.MAINSAIL_P2P_HOST, "0.0.0.0");
		assert.equal(resul.MAINSAIL_P2P_PORT, 4000);
		assert.equal(resul.MAINSAIL_WEBHOOKS_HOST, "0.0.0.0");
		assert.equal(resul.MAINSAIL_WEBHOOKS_PORT, 4004);
	});

	it("#addRecord - should add record", ({ generator }) => {
		const resul = generator.addRecord("TEST", "test").generate();

		assert.equal(resul.TEST, "test");
	});

	it("#addRecords - should add records", ({ generator }) => {
		const resul = generator.addRecords({ TEST: "test" }).generate();

		assert.equal(resul.TEST, "test");
	});

	it("#addRecords - should keep falsy-but-valid values and skip null/undefined", ({ generator }) => {
		const resul = generator
			.addRecords({ EMPTY: "", NOPE: undefined, NULLED: null, ZERO: 0 } as Record<string, string | number>)
			.generate();

		// 0 and "" are valid and must be preserved.
		assert.equal(resul.ZERO, 0);
		assert.equal(resul.EMPTY, "");
		// null / undefined are skipped.
		assert.undefined(resul.NOPE);
		assert.undefined(resul.NULLED);
	});
});
