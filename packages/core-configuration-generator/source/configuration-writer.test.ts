import { existsSync, readFileSync, readJSONSync } from "fs-extra";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../core-test-framework/distribution";
import { makeApplication } from "./application-factory";
import { Identifiers } from "./identifiers";
import { ConfigurationWriter } from "./configuration-writer";

describe<{
	dataPath: string;
	networkWriter: ConfigurationWriter;
}>("NetworkWriter", ({ beforeAll, beforeEach, it, assert }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach(async (context) => {
		context.dataPath = dirSync().name;

		const app = await makeApplication(context.dataPath);

		context.networkWriter = app.get<ConfigurationWriter>(Identifiers.ConfigurationWriter);
	});

	it("#writeApp - should write app.json", ({ dataPath, networkWriter }) => {
		networkWriter.writeApp({});

		assert.true(existsSync(join(dataPath, "app.json")));
	});

	it("#writeEnvironment - should write .env", ({ dataPath, networkWriter }) => {
		const environmnet = { TEST: "test" };

		networkWriter.writeEnvironment(environmnet);

		assert.true(existsSync(join(dataPath, ".env")));
		assert.true(readFileSync(join(dataPath, ".env")).toString().includes("TEST=test"));
	});

	it("#writePeers - should write peers.json", ({ dataPath, networkWriter }) => {
		const peers = [{ ip: "127.0.0.1", port: 4000 }];

		networkWriter.writePeers(peers);

		assert.true(existsSync(join(dataPath, "peers.json")));
		assert.equal(readJSONSync(join(dataPath, "peers.json")), { list: peers });
	});

	it("#writeGenesisWallet - should write genesis-wallet.json", ({ dataPath, networkWriter }) => {
		const wallet = {
			address: "address",
		};

		networkWriter.writeGenesisWallet(wallet);

		assert.true(existsSync(join(dataPath, "genesis-wallet.json")));
		assert.equal(readJSONSync(join(dataPath, "genesis-wallet.json")), wallet);
	});

	it("#writePeers - should write peers.json", ({ dataPath, networkWriter }) => {
		const peers = ["127.0.0.1"];

		networkWriter.writePeers(peers);

		assert.true(existsSync(join(dataPath, "peers.json")));
		assert.equal(readJSONSync(join(dataPath, "peers.json")), { list: peers });
	});

	it("#writeValidators - should write validators.json", ({ dataPath, networkWriter }) => {
		const mnemonics = ["menmonic_1", "menmonic_2"];

		networkWriter.writeValidators(mnemonics);

		assert.true(existsSync(join(dataPath, "validators.json")));
		assert.equal(readJSONSync(join(dataPath, "validators.json")), { secrets: mnemonics });
	});

	it("#writeCrypto - should write crypto.json", ({ dataPath, networkWriter }) => {
		const genesisBlock = {};
		const milestones = [];
		const network = {};

		networkWriter.writeCrypto(genesisBlock, milestones, network);

		assert.true(existsSync(join(dataPath, "crypto.json")));
		assert.equal(readJSONSync(join(dataPath, "crypto.json")), { genesisBlock, milestones, network });
	});
});
