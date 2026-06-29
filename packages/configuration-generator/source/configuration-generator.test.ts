import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { existsSync, readFileSync } from "fs";
import { ensureDirSync, readJSONSync } from "fs-extra/esm";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { makeApplication } from "./application-factory";
import { ConfigurationGenerator } from "./configuration-generator";
import { Identifiers as InternalIdentifiers } from "./identifiers";

// A representative genesis commit using the *current* block schema. The orchestrator forwards
// whatever the genesis generator returns straight into crypto.json, so this both documents the
// schema and lets us verify the writer serializes bigint fields (fee/reward) to strings.
const GENESIS_COMMIT = {
	block: {
		fee: 0n,
		gasUsed: 0,
		hash: "a".repeat(64),
		logsBloom: "0".repeat(512),
		number: 0,
		parentHash: "0".repeat(64),
		payloadSize: 8,
		proposer: `0x${"0".repeat(40)}`,
		reward: 0n,
		round: 0,
		stateRoot: "0".repeat(64),
		timestamp: 0,
		transactions: [],
		transactionsCount: 2,
		transactionsRoot: "b".repeat(64),
		version: 1,
	},
	proof: { round: 0, signature: "0".repeat(192), validators: [] },
	serialized: "deadbeef",
};

describe<{
	app: Application;
	configPath: string;
	generator: ConfigurationGenerator;
	genesis: { generate: (...arguments_: unknown[]) => Promise<unknown> };
}>("ConfigurationGenerator", ({ beforeAll, beforeEach, it, assert, spy, stub }) => {
	const options = (overrides: Record<string, unknown> = {}) => ({
		chainId: 10_000,
		network: "devnet",
		symbol: "my",
		token: "myn",
		...overrides,
	});

	beforeAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		// A fresh, non-existent destination inside a throwaway temp directory.
		context.configPath = join(dirSync().name, "devnet");

		context.app = await makeApplication(context.configPath);

		// Silence the default console logger; the logging test re-stubs this binding.
		context.app.rebind(Identifiers.Services.Log.Service).toConstantValue({
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		});

		// The genesis block generator is the only dependency that boots the Rust EVM. Stub it so the
		// orchestrator can be exercised end-to-end; every other generator and the writer run for real.
		context.genesis = { generate: async () => GENESIS_COMMIT };
		context.app.rebind(InternalIdentifiers.Generator.GenesisBlock).toConstantValue(context.genesis);

		context.generator = context.app.get<ConfigurationGenerator>(InternalIdentifiers.ConfigurationGenerator);
	});

	it("should generate a complete configuration with default options", async ({ generator, configPath }) => {
		await generator.generate(options());

		assert.true(existsSync(configPath));
		for (const file of [
			"genesis-wallet.json",
			"crypto.json",
			"peers.json",
			"validators.json",
			".env",
			"app.json",
		]) {
			assert.true(existsSync(join(configPath, file)));
		}
		// No snapshot was requested.
		assert.false(existsSync(join(configPath, "snapshot")));

		const crypto = readJSONSync(join(configPath, "crypto.json"));

		// Genesis block is forwarded verbatim, with bigint fields serialized to strings.
		assert.equal(crypto.genesisBlock.serialized, "deadbeef");
		assert.equal(crypto.genesisBlock.block.transactionsCount, 2);
		assert.equal(crypto.genesisBlock.block.parentHash, "0".repeat(64));
		assert.equal(crypto.genesisBlock.block.transactionsRoot, "b".repeat(64));
		assert.equal(crypto.genesisBlock.block.fee, "0");
		assert.equal(crypto.genesisBlock.block.reward, "0");

		// Default milestones: genesis, the round-validator milestone at height 1, and the reward milestone.
		assert.length(crypto.milestones, 3);
		assert.equal(crypto.milestones[0].height, 0);
		assert.equal(crypto.milestones[0].roundValidators, 0);
		assert.equal(crypto.milestones[0].timeouts.blockTime, 8000);
		assert.equal(crypto.milestones[0].timeouts.blockPrepareTime, 4000);
		assert.equal(crypto.milestones[0].timeouts.stageTimeout, 2000);
		assert.equal(crypto.milestones[0].timeouts.stageTimeoutIncrease, 2000);
		assert.equal(crypto.milestones[1], { height: 1, roundValidators: 53 });
		assert.equal(crypto.milestones[2], { height: 75_600, reward: "2000000000000000000" });

		// Network reflects the requested token/symbol and the default key/wif prefixes.
		assert.equal(crypto.network.chainId, 10_000);
		assert.equal(crypto.network.client, { explorer: "", symbol: "my", token: "myn" });
		assert.equal(crypto.network.name, "devnet");
		assert.equal(crypto.network.pubKeyHash, 30);
		assert.equal(crypto.network.wif, 186);
		assert.length(crypto.network.nethash, 64);

		// 53 validator secrets by default.
		assert.length(readJSONSync(join(configPath, "validators.json")).secrets, 53);

		// Peers use the default p2p port.
		assert.equal(readJSONSync(join(configPath, "peers.json")), { list: [{ ip: "127.0.0.1", port: 4000 }] });

		// genesis-wallet holds a derived address and its passphrase.
		const wallet = readJSONSync(join(configPath, "genesis-wallet.json"));
		assert.string(wallet.address);
		assert.string(wallet.passphrase);

		// .env carries the core defaults.
		assert.true(readFileSync(join(configPath, ".env")).toString().includes("MAINSAIL_P2P_PORT=4000"));
	});

	it("should log every task and the completion message when a logger is bound", async ({
		app,
		generator,
		configPath,
	}) => {
		const info = stub(app.get(Identifiers.Services.Log.Service), "info");

		await generator.generate(options());

		// 7 task titles (prepare, genesis-wallet, crypto, peers, validators, .env, app) + the completion line.
		info.calledTimes(8);
		info.calledWith("Preparing directories.");
		info.calledWith("Writing crypto.json in core config path.");
		info.calledWith("Writing .env in core config path.");
		info.calledWith(`Configuration generated on location: ${configPath}`);
	});

	it("should still generate when no logger is bound", async ({ app, generator, configPath }) => {
		app.unbind(Identifiers.Services.Log.Service);

		await assert.resolves(() => generator.generate(options()));
		assert.true(existsSync(join(configPath, "crypto.json")));
	});

	it("should throw if the configuration destination already exists", async ({ generator, configPath }) => {
		ensureDirSync(configPath);

		await assert.rejects(() => generator.generate(options()), `${configPath} already exists.`);

		// It bails on the first task, before writing any config files.
		assert.false(existsSync(join(configPath, "crypto.json")));
	});

	it("should overwrite an existing destination when overwriteConfig is set", async ({ generator, configPath }) => {
		ensureDirSync(configPath);

		await assert.resolves(() => generator.generate(options({ overwriteConfig: true })));
		assert.true(existsSync(join(configPath, "crypto.json")));
	});

	it("should apply custom network, milestone and reward options", async ({ generator, configPath, genesis }) => {
		const generate = spy(genesis, "generate");

		await generator.generate(
			options({
				blockTime: 9000,
				explorer: "myex.io",
				pubKeyHash: 168,
				rewardAmount: "200000000",
				rewardHeight: 23_000,
				validators: 7,
				wif: 27,
			}),
		);

		const crypto = readJSONSync(join(configPath, "crypto.json"));

		assert.equal(crypto.milestones[0].timeouts.blockTime, 9000);
		assert.equal(crypto.milestones[0].timeouts.blockPrepareTime, 4500);
		assert.equal(crypto.milestones[1], { height: 1, roundValidators: 7 });
		assert.equal(crypto.milestones[2], { height: 23_000, reward: "200000000" });

		assert.equal(crypto.network.client.explorer, "myex.io");
		assert.equal(crypto.network.pubKeyHash, 168);
		assert.equal(crypto.network.wif, 27);

		assert.length(readJSONSync(join(configPath, "validators.json")).secrets, 7);

		// The orchestrator forwards the merged options (custom + defaults) and validator mnemonics.
		const [, validatorMnemonics, internalOptions] = generate.getCallArgs(0) as [string, string[], any];
		assert.length(validatorMnemonics, 7);
		assert.equal(internalOptions.blockTime, 9000);
		assert.equal(internalOptions.premine, "125000000000000000000000000");
	});

	it("should only write the files enabled in the write options", async ({ generator, configPath }) => {
		await generator.generate(options(), {
			writeApp: false,
			writeValidators: false,
		});

		// The prepare task always runs and creates the destination directory.
		assert.true(existsSync(configPath));
		assert.true(existsSync(join(configPath, "crypto.json")));
		assert.true(existsSync(join(configPath, "peers.json")));
		assert.true(existsSync(join(configPath, "genesis-wallet.json")));

		// Disabled writers leave no files behind. Note .env is produced by the validators task.
		assert.false(existsSync(join(configPath, "app.json")));
		assert.false(existsSync(join(configPath, "validators.json")));
		assert.false(existsSync(join(configPath, ".env")));
	});
});
