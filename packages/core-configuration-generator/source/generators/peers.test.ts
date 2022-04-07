import { describe } from "../../../core-test-framework/distribution";
import { PeersGenerator } from "./peers";

describe<{
	dataPath: string;
	generator: PeersGenerator;
}>("PeersGenerator", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.generator = new PeersGenerator();
	});

	it("#generateDefault - should default data", ({ generator }) => {
		assert.equal(generator.generate(4000, ["127.0.0.1"]), [{ ip: "127.0.0.1", port: 4000 }]);
	});
});
