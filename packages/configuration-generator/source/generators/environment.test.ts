import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../core-test-framework/distribution";
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

		assert.equal(resul.CORE_LOG_LEVEL, "info");
		assert.equal(resul.CORE_LOG_LEVEL_FILE, "info");
		assert.equal(resul.CORE_P2P_HOST, "0.0.0.0");
		assert.equal(resul.CORE_P2P_PORT, 4000);
		assert.equal(resul.CORE_WEBHOOKS_HOST, "0.0.0.0");
		assert.equal(resul.CORE_WEBHOOKS_PORT, 4004);
	});

	it("#addRecord - should add record", ({ generator }) => {
		const resul = generator.addRecord("TEST", "test").generate();

		assert.equal(resul.TEST, "test");
	});

	it("#addRecords - should add records", ({ generator }) => {
		const resul = generator.addRecords({ TEST: "test" }).generate();

		assert.equal(resul.TEST, "test");
	});
});
