import { Identifiers } from "@mainsail/constants";
import { FunctionSigs } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { ensureDirSync, readJSONSync } from "fs-extra/esm";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";
import { serializeTransaction } from "viem";

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
}>("ConfigurationGenerator", ({ beforeAll, beforeEach, afterEach, it, assert, spy, stub }) => {
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

	// makeApplication wires up the Rust EVM addon, whose native runtime keeps the event loop
	// alive until an instance is disposed. Tear it down so the test process exits cleanly.
	afterEach(async ({ app }) => {
		await app.getTagged<{ dispose(): Promise<void> }>(Identifiers.Evm.Instance, "instance", "evm").dispose();
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
		assert.equal(crypto.milestones[1], {
			height: 1,
			roundValidators: 53,
			validatorRegistrationFee: "250000000000000000000",
		});
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
		info.calledTimes(9);
		info.calledWith("Preparing directories.");
		info.calledWith("Writing crypto.json in core config path.");
		info.calledWith("Writing .env in core config path.");
		info.calledWith(`Configuration generated on location: ${configPath}`);
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
		assert.equal(crypto.milestones[1], {
			height: 1,
			roundValidators: 7,
			validatorRegistrationFee: "250000000000000000000",
		});
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

	// Three valid, distinct BIP39 mnemonics for the externally-supplied-secrets cases.
	const MNEMONIC_A = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
	const MNEMONIC_B = "legal winner thank year wave sausage worth useful legal winner thank yellow";
	const MNEMONIC_C = "letter advice cage absurd amount doctor acoustic avoid letter advice cage above";

	it("should use externally supplied validator mnemonics matching the validator count", async ({
		generator,
		configPath,
		genesis,
	}) => {
		const generate = spy(genesis, "generate");

		await generator.generate(options({ validatorMnemonics: [MNEMONIC_A, MNEMONIC_B], validators: 2 }));

		// validators.json holds exactly the supplied secrets, in order.
		assert.equal(readJSONSync(join(configPath, "validators.json")).secrets, [MNEMONIC_A, MNEMONIC_B]);

		// The active round-validator set matches the supplied list.
		const crypto = readJSONSync(join(configPath, "crypto.json"));
		assert.equal(crypto.milestones[1], {
			height: 1,
			roundValidators: 2,
			validatorRegistrationFee: "250000000000000000000",
		});

		// The generator receives the supplied mnemonics.
		const [, validatorMnemonics] = generate.getCallArgs(0) as [string, string[], any];
		assert.equal(validatorMnemonics, [MNEMONIC_A, MNEMONIC_B]);
	});

	it("should reject validator mnemonics whose count differs from the validators count", async ({
		generator,
		configPath,
	}) => {
		await assert.rejects(
			() => generator.generate(options({ validatorMnemonics: [MNEMONIC_A, MNEMONIC_B], validators: 3 })),
			"validatorMnemonics length (2) does not match the validators count (3).",
		);

		// Rejected up front, before any config file is written.
		assert.false(existsSync(join(configPath, "crypto.json")));
	});

	it("should use an externally supplied genesis mnemonic", async ({ generator, configPath, genesis }) => {
		const generate = spy(genesis, "generate");

		await generator.generate(options({ genesisMnemonic: MNEMONIC_C }));

		// The genesis wallet is derived from the supplied mnemonic.
		assert.equal(readJSONSync(join(configPath, "genesis-wallet.json")).passphrase, MNEMONIC_C);
		assert.equal(generate.getCallArgs(0)[0], MNEMONIC_C);
	});

	it("should reject an invalid validator mnemonic before touching the EVM", async ({ generator, configPath }) => {
		await assert.rejects(
			() =>
				generator.generate(options({ validatorMnemonics: [MNEMONIC_A, "not a real mnemonic"], validators: 2 })),
			"validatorMnemonics[1] is not a valid BIP39 mnemonic.",
		);

		// Validation happens up front, before any config file is written.
		assert.false(existsSync(join(configPath, "crypto.json")));
	});

	it("should reject an invalid genesis mnemonic", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ genesisMnemonic: "nope" })),
			"genesisMnemonic is not a valid BIP39 mnemonic.",
		);
	});

	it("should reject an empty validator mnemonic list", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ validatorMnemonics: [] })),
			"validatorMnemonics must be a non-empty array.",
		);
	});

	it("should reject duplicate validator mnemonics", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ validatorMnemonics: [MNEMONIC_A, MNEMONIC_A], validators: 2 })),
			"validatorMnemonics contains duplicate entries.",
		);
	});

	it("should reject a genesis mnemonic that is also a validator mnemonic", async ({ generator }) => {
		await assert.rejects(
			() =>
				generator.generate(
					options({
						genesisMnemonic: MNEMONIC_A,
						validatorMnemonics: [MNEMONIC_A, MNEMONIC_B],
						validators: 2,
					}),
				),
			"genesisMnemonic must not also be a validator mnemonic.",
		);
	});

	// Structurally valid presigned transactions carrying dummy signatures. The orchestrator only
	// raw-deserializes them to enforce the registerValidator-only rule and derive the count;
	// signature verification is done by the (here stubbed) genesis block generator. Distinct
	// payload suffixes keep the entries unique.
	const makePresignedTransaction = (to: string, nonce: number, data: string): string =>
		serializeTransaction(
			{
				chainId: 10_000,
				data: data as `0x${string}`,
				gas: 500_000n,
				gasPrice: 0n,
				nonce,
				to: to as `0x${string}`,
				type: "legacy",
				value: 0n,
			},
			{ r: `0x${"1".padStart(64, "0")}`, s: `0x${"1".padStart(64, "0")}`, v: 27n },
		).slice(2);

	const makeValidatorRegistrations = (app: Application, validators: number): string[] => {
		const consensusContract = app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus);

		const transactions: string[] = [];
		for (let index = 1; index <= validators; index++) {
			transactions.push(
				makePresignedTransaction(
					consensusContract,
					0,
					`${FunctionSigs.ConsensusV1.RegisterValidator}0${index}`,
				),
			);
		}

		return transactions;
	};

	it("should derive the validator count from presigned validator registrations", async ({
		app,
		generator,
		configPath,
		genesis,
	}) => {
		const generate = spy(genesis, "generate");
		const validatorRegistrations = makeValidatorRegistrations(app, 2);

		await generator.generate(options({ validatorRegistrations }));

		// No validator secrets exist; validators.json is written empty.
		assert.equal(readJSONSync(join(configPath, "validators.json")).secrets, []);

		// The active round-validator set follows the number of presigned registrations.
		const crypto = readJSONSync(join(configPath, "crypto.json"));
		assert.equal(crypto.milestones[1], {
			height: 1,
			roundValidators: 2,
			validatorRegistrationFee: "250000000000000000000",
		});

		// The genesis generator receives no validator mnemonics; the presigned transactions
		// and the derived count ride in the options.
		const [, validatorMnemonics, internalOptions] = generate.getCallArgs(0) as [string, string[], any];
		assert.equal(validatorMnemonics, []);
		assert.equal(internalOptions.validators, 2);
		assert.equal(internalOptions.validatorRegistrations, validatorRegistrations);
	});

	it("should accept an explicit validators count matching the presigned registrations", async ({
		app,
		generator,
		configPath,
	}) => {
		await generator.generate(
			options({ validators: 2, validatorRegistrations: makeValidatorRegistrations(app, 2) }),
		);

		assert.equal(readJSONSync(join(configPath, "crypto.json")).milestones[1].roundValidators, 2);
	});

	it("should reject an explicit validators count that differs from the presigned registrations", async ({
		app,
		generator,
		configPath,
	}) => {
		await assert.rejects(
			() =>
				generator.generate(
					options({ validators: 3, validatorRegistrations: makeValidatorRegistrations(app, 2) }),
				),
			"validatorRegistrations length (2) does not match the validators count (3).",
		);

		// Rejected up front, before any config file is written.
		assert.false(existsSync(join(configPath, "crypto.json")));
	});

	it("should use an externally supplied genesis mnemonic alongside presigned validator registrations", async ({
		app,
		generator,
		configPath,
	}) => {
		await generator.generate(
			options({ genesisMnemonic: MNEMONIC_C, validatorRegistrations: makeValidatorRegistrations(app, 2) }),
		);

		assert.equal(readJSONSync(join(configPath, "genesis-wallet.json")).passphrase, MNEMONIC_C);
	});

	it("should reject validator mnemonics combined with presigned validator registrations", async ({
		app,
		generator,
	}) => {
		await assert.rejects(
			() =>
				generator.generate(
					options({
						validatorMnemonics: [MNEMONIC_A],
						validators: 1,
						validatorRegistrations: makeValidatorRegistrations(app, 1),
					}),
				),
			"validatorMnemonics and validatorRegistrations are mutually exclusive.",
		);
	});

	it("should reject an empty presigned validator registrations list", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: [] })),
			"validatorRegistrations must be a non-empty array.",
		);
	});

	it("should reject a non-string presigned validator transaction", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: [123] })),
			"validatorRegistrations[0] must be a hex-encoded serialized transaction.",
		);
	});

	it("should reject duplicate presigned validator registrations", async ({ app, generator }) => {
		const [registration] = makeValidatorRegistrations(app, 1);

		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: [registration, registration] })),
			"validatorRegistrations contains duplicate entries.",
		);
	});

	it("should reject a presigned validator registration that cannot be deserialized", async ({ generator }) => {
		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: ["deadbeef"] })),
			"validatorRegistrations[0] cannot be deserialized",
		);
	});

	it("should reject a presigned transaction that is not a registerValidator call", async ({ app, generator }) => {
		const consensusContract = app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus);
		const vote = makePresignedTransaction(consensusContract, 1, `${FunctionSigs.ConsensusV1.Vote}01`);

		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: [vote] })),
			"validatorRegistrations[0] is not a registerValidator call to the consensus contract.",
		);
	});

	it("should reject a presigned registerValidator call to another contract", async ({ app, generator }) => {
		const [registration] = makeValidatorRegistrations(app, 1);
		const elsewhere = makePresignedTransaction(
			`0x${"1".repeat(40)}`,
			0,
			`${FunctionSigs.ConsensusV1.RegisterValidator}01`,
		);

		await assert.rejects(
			() => generator.generate(options({ validatorRegistrations: [registration, elsewhere] })),
			"validatorRegistrations[1] is not a registerValidator call to the consensus contract.",
		);
	});

	it("should write database settings to .env when all DB options are provided", async ({ generator, configPath }) => {
		await generator.generate(
			options({
				coreDBDatabase: "mydb",
				coreDBHost: "db-host",
				coreDBPassword: "pass",
				coreDBPort: 6543,
				coreDBUsername: "user",
			}),
		);

		const environment = readFileSync(join(configPath, ".env")).toString();
		assert.true(environment.includes("MAINSAIL_DB_HOST=db-host"));
		assert.true(environment.includes("MAINSAIL_DB_PORT=6543"));
		assert.true(environment.includes("MAINSAIL_DB_USERNAME=user"));
		assert.true(environment.includes("MAINSAIL_DB_PASSWORD=pass"));
		assert.true(environment.includes("MAINSAIL_DB_DATABASE=mydb"));
	});

	it("should throw when a snapshot is requested without a snapshot hash", async ({ app }) => {
		const importer = {
			genesisBlockNumber: 0n,
			prepare: async () => {},
			previousGenesisBlockHash: "",
			snapshotHash: "",
			validators: [],
		};
		app.rebind(Identifiers.Snapshot.Legacy.Importer).toConstantValue(importer);
		const generator = app.get<ConfigurationGenerator>(InternalIdentifiers.ConfigurationGenerator);

		await assert.rejects(
			() => generator.generate(options({ snapshot: { path: "/snapshot/path" } })),
			"missing snapshot config",
		);
	});
});
