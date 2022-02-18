const bench = require("micro-bmark");
const { run, mark } = bench; // or bench.mark

const registerSuite = async (suite) => {
	for (const [label, callback] of Object.entries(require(suite))) {
		await mark(label, callback);
	}
};

run(async () => {
	await registerSuite("./crypto/hash-algorithms");
	// await registerSuite("./block/create");
	// await registerSuite("./block/serialize");
	// await registerSuite("./block/serializeWithTransactions");
	// await registerSuite("./block/deserialize/0");
	// await registerSuite("./block/deserialize/150");
	// await registerSuite("./transaction/create/0");
	// await registerSuite("./transaction/serialize/0");
	// await registerSuite("./transaction/deserialize/0");

	bench.logMem();
	bench.getTime();
});
