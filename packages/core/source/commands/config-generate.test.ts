import { existsSync, readFileSync } from "fs";
import { ensureDirSync, readJSONSync } from "fs-extra/esm";
import { join } from "path";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Command } from "./config-generate";

describe<{
	cli: Console;
	configPath: string;
}>("ConfigGenerateCommand", ({ beforeEach, afterAll, it, assert }) => {
	const generatedFiles = [".env", "app.json", "crypto.json", "genesis-wallet.json", "peers.json", "validators.json"];

	// Generation runs the real pipeline (including the EVM-backed genesis block), so keep
	// the validator count small.
	const generateFlags = (configPath: string, overrides: Record<string, unknown> = {}) => ({
		blockTime: "9000",
		configPath,
		explorer: "myex.io",
		maxBlockPayload: "123444",
		maxTxPerBlock: "122",
		network: "devnet",
		premine: "12500000000000000000000000",
		pubKeyHash: "168",
		rewardAmount: "2000000000000000000",
		rewardHeight: "23000",
		symbol: "my",
		token: "myn",
		validators: "3",
		wif: "27",
		...overrides,
	});

	beforeEach((context) => {
		context.cli = new Console();
		context.configPath = dirSync().name;
	});

	afterAll(() => setGracefulCleanup());

	it("should generate a new configuration", async ({ cli, configPath }) => {
		await cli.withFlags(generateFlags(configPath)).execute(Command);

		for (const file of generatedFiles) {
			assert.true(existsSync(join(configPath, "devnet", file)));
		}

		const crypto = readJSONSync(join(configPath, "devnet", "crypto.json"));
		assert.equal(crypto.network.name, "devnet");
		assert.equal(crypto.network.chainId, 10_000);
		assert.equal(crypto.network.pubKeyHash, 168);
		assert.equal(crypto.network.wif, 27);
		assert.equal(crypto.network.client, { explorer: "myex.io", symbol: "my", token: "myn" });
		assert.equal(crypto.milestones[0].timeouts.blockTime, 9000);
		assert.equal(crypto.milestones[1].roundValidators, 3);
		assert.equal(crypto.milestones[2].height, 23_000);
		assert.equal(crypto.milestones[2].reward, "2000000000000000000");
		assert.equal(crypto.genesisBlock.block.number, 0);

		assert.length(readJSONSync(join(configPath, "devnet", "validators.json")).secrets, 3);
	});

	it("should throw if the configuration destination already exists", async ({ cli, configPath }) => {
		ensureDirSync(join(configPath, "devnet"));

		await assert.rejects(
			() => cli.withFlags(generateFlags(configPath)).execute(Command),
			`${join(configPath, "devnet")} already exists.`,
		);
	});

	it("should overwrite an existing destination when overwriteConfig is set", async ({ cli, configPath }) => {
		ensureDirSync(join(configPath, "devnet"));

		await cli.withFlags(generateFlags(configPath, { overwriteConfig: true })).execute(Command);

		assert.true(existsSync(join(configPath, "devnet", "crypto.json")));
	});

	it("should generate a new configuration with the force flag and defaults", async ({ cli, configPath }) => {
		await cli.withFlags({ configPath, force: true, validators: "3" }).execute(Command);

		for (const file of generatedFiles) {
			assert.true(existsSync(join(configPath, "devnet", file)));
		}

		// The defaults must produce a working genesis (chainId and wei-scale premine).
		const crypto = readJSONSync(join(configPath, "devnet", "crypto.json"));
		assert.equal(crypto.network.chainId, 10_000);
	});

	it("should generate a new configuration if the properties are confirmed", async ({ cli, configPath }) => {
		prompts.inject([
			"devnet",
			"12500000000000000000000000",
			"3",
			"9000",
			"122",
			"123444",
			"23000",
			"2000000000000000000",
			"168",
			"27",
			"myn",
			"my",
			"myex.io",
			true,
		]);

		await cli.withFlags({ configPath }).execute(Command);

		// The prompt path appends the application name to the destination.
		for (const file of generatedFiles) {
			assert.true(existsSync(join(configPath, "devnet", "mainsail", file)));
		}
	});

	it("should allow empty peers", async ({ cli, configPath }) => {
		await cli.withFlags(generateFlags(configPath, { peers: "" })).execute(Command);

		assert.equal(readJSONSync(join(configPath, "devnet", "peers.json")).list, []);
	});

	it("should trim whitespace around the peer entries", async ({ cli, configPath }) => {
		await cli.withFlags(generateFlags(configPath, { peers: "127.0.0.1, 127.0.0.2, 127.0.0.3" })).execute(Command);

		assert.equal(readJSONSync(join(configPath, "devnet", "peers.json")).list, [
			{ ip: "127.0.0.1", port: 4000 },
			{ ip: "127.0.0.2", port: 4000 },
			{ ip: "127.0.0.3", port: 4000 },
		]);
	});

	it("should write the p2p port to the environment file and the peer list", async ({ cli, configPath }) => {
		await cli.withFlags(generateFlags(configPath, { coreP2PPort: 3002 })).execute(Command);

		assert.true(readFileSync(join(configPath, "devnet", ".env"), "utf8").includes("MAINSAIL_P2P_PORT=3002"));
		assert.equal(readJSONSync(join(configPath, "devnet", "peers.json")).list, [{ ip: "127.0.0.1", port: 3002 }]);
	});

	it("should apply a custom epoch", async ({ cli, configPath }) => {
		await cli
			.withFlags(generateFlags(configPath, { epoch: new Date("2020-11-04T00:00:00.000Z") }))
			.execute(Command);

		assert.equal(
			readJSONSync(join(configPath, "devnet", "crypto.json")).milestones[0].epoch,
			"2020-11-04T00:00:00.000Z",
		);
	});

	it("should throw if the properties are not confirmed", async ({ cli }) => {
		prompts.inject([
			"devnet",
			"120000000000",
			"47",
			"9",
			"122",
			"123444",
			"23000",
			"66000",
			"168",
			"27",
			"myn",
			"my",
			"myex.io",
			false,
		]);

		await assert.rejects(() => cli.execute(Command), "You'll need to confirm the input to continue.");
	});

	it("should throw if string property is undefined", async ({ cli }) => {
		prompts.inject([
			"undefined",
			"120000000000",
			"47",
			"9",
			"122",
			"123444",
			"23000",
			"66000",
			"168",
			"27",
			"myn",
			"m",
			"myex.io",
			true,
		]);

		await assert.rejects(() => cli.execute(Command), "Flag network is required.");
	});

	it("should throw if numeric property is Nan", async ({ cli }) => {
		prompts.inject([
			"devnet",
			"120000000000",
			"47",
			"9",
			"122",
			"123444",
			"23000",
			"66000",
			"168",
			Number.NaN,
			"myn",
			"m",
			"myex.io",
			true,
		]);

		await assert.rejects(() => cli.execute(Command), "Flag wif is required.");
	});
});
