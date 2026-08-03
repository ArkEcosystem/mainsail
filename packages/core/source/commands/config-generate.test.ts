import { Identifiers as GeneratorIdentifiers, makeApplication } from "@mainsail/configuration-generator";
import { Enums, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { buildProofOfPossession } from "@mainsail/crypto-key-pair-bls12-381";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { FunctionSigs } from "@mainsail/evm-contracts";
import { existsSync, readFileSync } from "fs";
import { ensureDirSync, readJSONSync, writeJSONSync } from "fs-extra/esm";
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

	it("should generate genesis from an external validators file", async ({ cli, configPath }) => {
		const validatorMnemonics = [
			"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
			"legal winner thank year wave sausage worth useful legal winner thank yellow",
			"letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
		];
		const genesisMnemonic = "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong";
		const validatorsFile = join(dirSync().name, "validators.json");
		writeJSONSync(validatorsFile, { genesisMnemonic, validatorMnemonics });

		// --validators is omitted, so the count is derived from the supplied list (3).
		await cli
			.withFlags(generateFlags(configPath, { force: true, validatorsFile, validators: undefined }))
			.execute(Command);

		// validators.json holds exactly the supplied secrets, and the genesis wallet uses the supplied mnemonic.
		assert.equal(readJSONSync(join(configPath, "devnet", "validators.json")).secrets, validatorMnemonics);
		assert.equal(readJSONSync(join(configPath, "devnet", "genesis-wallet.json")).passphrase, genesisMnemonic);

		// The genesis block was produced and the active round-validator set follows the supplied list.
		assert.equal(readJSONSync(join(configPath, "devnet", "crypto.json")).milestones[1].roundValidators, 3);
	});

	it("should reject an explicit --validators that conflicts with the validators file", async ({
		cli,
		configPath,
	}) => {
		const validatorsFile = join(dirSync().name, "validators.json");
		writeJSONSync(validatorsFile, {
			validatorMnemonics: [
				"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
				"legal winner thank year wave sausage worth useful legal winner thank yellow",
				"letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
			],
		});

		// Explicit --validators (9) conflicts with the 3 supplied mnemonics — rejected, not overridden.
		await assert.rejects(
			() =>
				cli
					.withFlags(generateFlags(configPath, { force: true, validatorsFile, validators: "9" }))
					.execute(Command),
			"validatorMnemonics length (3) does not match the validators count (9).",
		);
	});

	it("should reject an external validators file with an invalid mnemonic", async ({ cli, configPath }) => {
		const validatorsFile = join(dirSync().name, "bad-validators.json");
		writeJSONSync(validatorsFile, { validatorMnemonics: ["not a valid mnemonic"] });

		// --validators omitted so the count matches (1), letting the BIP39 check be the one to fire.
		await assert.rejects(
			() =>
				cli
					.withFlags(generateFlags(configPath, { force: true, validatorsFile, validators: undefined }))
					.execute(Command),
			"validatorMnemonics[0] is not a valid BIP39 mnemonic.",
		);
	});

	// Presigns one registerValidator transaction per freshly generated wallet, exactly as
	// external validator tooling would — the command under test never sees the secrets. The
	// registerValidator(bytes,bytes) calldata is hand-encoded to avoid pulling an ABI encoder
	// into this package.
	const makePresignedValidatorRegistrations = async (validators: number): Promise<string[]> => {
		const app = await makeApplication(dirSync().name, {});

		app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(
			{
				genesisBlock: {
					// @ts-ignore
					block: {
						number: 0,
						timestamp: 0,
					},
				},
				milestones: [
					{
						block: { maxGasLimit: 30_000_000, maxPayload: 2_097_152, version: 1 },
						evmSpec: Enums.Evm.SpecId.OSAKA,
						// @ts-ignore
						gas: {
							maximumGasLimit: 2_000_000,
							maximumGasPrice: 10_000 * 1e9,
							minimumGasLimit: 21_000,
							minimumGasPrice: 5 * 1e9,
						},
						height: 0,
						reward: "0",
					},
				],
				// @ts-ignore
				network: {
					chainId: 10_000,
				},
			},
			false,
		);

		const walletGenerator = app.get<{ generate: () => Promise<any> }>(GeneratorIdentifiers.Generator.Wallet);
		const consensusContract = app.get<string>(Identifiers.EvmConsensus.Contracts.Consensus);

		const abiEncodeBytes = (hex: string): string =>
			(hex.length / 2).toString(16).padStart(64, "0") + hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");

		const transactions: string[] = [];

		for (let index = 0; index < validators; index++) {
			const wallet = await walletGenerator.generate();
			const { pop } = buildProofOfPossession(Buffer.from(wallet.consensusKeys.privateKey, "hex"));

			// registerValidator(bytes blsPublicKey, bytes proofOfPossession)
			const registrationData =
				FunctionSigs.ConsensusV1.RegisterValidator +
				(0x40).toString(16).padStart(64, "0") +
				(0xa0).toString(16).padStart(64, "0") +
				abiEncodeBytes(wallet.consensusKeys.publicKey) +
				abiEncodeBytes(Buffer.from(pop).toString("hex"));

			const registration = await (
				await app
					.resolve(TransactionBuilder)
					.network(10_000)
					.recipientAddress(consensusContract)
					.nonce("0")
					.payload(registrationData)
					.gasPrice(0)
					.gasLimit(500_000)
					.sign(wallet.passphrase)
			).build();

			transactions.push(registration.serialized.toString("hex"));
		}

		for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
			await app.getTagged<{ dispose(): Promise<void> }>(Identifiers.Evm.Instance, "instance", tag).dispose();
		}

		return transactions;
	};

	it("should generate genesis from presigned validator transactions", async ({ cli, configPath }) => {
		const validatorRegistrations = await makePresignedValidatorRegistrations(2);

		const validatorsFile = join(dirSync().name, "presigned.json");
		writeJSONSync(validatorsFile, { validatorRegistrations });

		// --validators is omitted, so the count is derived from the presigned registrations (2).
		await cli
			.withFlags(generateFlags(configPath, { force: true, validatorsFile, validators: undefined }))
			.execute(Command);

		// No validator secrets exist anywhere in the generated configuration.
		assert.equal(readJSONSync(join(configPath, "devnet", "validators.json")).secrets, []);

		const crypto = readJSONSync(join(configPath, "devnet", "crypto.json"));
		assert.equal(crypto.milestones[1].roundValidators, 2);

		// 2 premine transfers + 2 registrations; no votes exist at genesis in presigned mode.
		assert.equal(crypto.genesisBlock.block.transactionsCount, 4);
	});

	it("should reject a validators file whose validatorRegistrations is not an array", async ({ cli, configPath }) => {
		const validatorsFile = join(dirSync().name, "bad-presigned.json");
		writeJSONSync(validatorsFile, { validatorRegistrations: "not-an-array" });

		await assert.rejects(
			() =>
				cli
					.withFlags(generateFlags(configPath, { force: true, validatorsFile, validators: undefined }))
					.execute(Command),
			'"validatorRegistrations" must be an array of hex-encoded transactions.',
		);
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
