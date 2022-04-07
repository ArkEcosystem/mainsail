import { Application } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import envPaths from "env-paths";
import fs from "fs-extra";
import { join } from "path";

import { describe } from "../../core-test-framework/distribution";
import { makeApplication } from "./application-factory";
import { ConfigurationGenerator } from "./configuration-generator";
import { Identifiers as InternalIdentifiers } from "./identifiers";

describe<{
	app: Application;
	generator: ConfigurationGenerator;
}>("NetworkGenerator", ({ beforeEach, it, assert, stub, match }) => {
	const paths = envPaths("myn", { suffix: "core" });
	const configCore = join(paths.config, "testnet");

	beforeEach(async (context) => {
		context.app = await makeApplication(configCore);
		context.generator = context.app.get<ConfigurationGenerator>(InternalIdentifiers.ConfigurationGenerator);
	});

	it("should generate a new configuration", async ({ generator }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await generator.generate({
			network: "testnet",
			symbol: "my",
			token: "myn",
		});

		existsSync.calledWith(configCore);

		ensureDirSync.calledWith(configCore);

		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();

		writeJSONSync.calledWith(
			match("crypto.json"),
			match({
				genesisBlock: {
					blockSignature: match.string,
					generatorPublicKey: match.string,
					height: 1,
					id: match.string,
					numberOfTransactions: 103,
					payloadHash: match.string,
					payloadLength: 3296,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					timestamp: match.number,
					totalAmount: BigNumber.make("12500000000000000"),
					totalFee: BigNumber.ZERO,
					transactions: match.array,
					version: 1,
				},
				milestones: [
					match({
						activeValidators: 51,
						address: match.object,
						block: match.object,
						blockTime: 8,
						epoch: match.string,
						height: 1,
						multiPaymentLimit: 256,
						reward: "0", // TODO: Check
						satoshi: match.object,
						vendorFieldLength: 255,
					}),
					match({
						activeValidators: 51,
						address: match.object,
						block: match.object,
						blockTime: 8,
						epoch: match.string,
						height: 75_600,
						multiPaymentLimit: 256,
						reward: "200000000",
						satoshi: match.object,
						vendorFieldLength: 255,
					}),
				],
				network: {
					client: { explorer: "", symbol: "my", token: "myn" },
					messagePrefix: "testnet message:\n",
					name: "testnet",
					nethash: match.string,
					pubKeyHash: 30,
					slip44: 1,
					wif: 186,
				},
			}),
			{ spaces: 4 },
		);
	});

	it("should log if logger is provided", async ({ generator, app }) => {
		const logger = {
			info: () => {},
		};

		app.bind(InternalIdentifiers.LogService).toConstantValue(logger);

		const log = stub(logger, "info");
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await generator.generate({
			network: "testnet",
			symbol: "my",
			token: "myn",
		});

		existsSync.calledWith(configCore);
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
		log.calledTimes(8);
	});

	it("should throw if the core configuration destination already exists", async ({ generator }) => {
		stub(fs, "existsSync").returnValueOnce(true);

		await assert.rejects(
			() =>
				generator.generate({
					network: "testnet",
					symbol: "my",
					token: "myn",
				}),
			`${configCore} already exists.`,
		);
	});

	it("should generate a new configuration with additional flags", async ({ generator }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await generator.generate({
			blockTime: 9,
			coreDBDatabase: "database",
			coreDBHost: "localhost",
			coreDBPassword: "password",
			coreDBPort: 5432,
			coreDBUsername: "username",
			coreP2PPort: 4000,
			coreWebhooksPort: 4004,
			distribute: true,
			epoch: new Date(new Date().toISOString().slice(0, 11) + "00:00:00.000Z"),
			explorer: "myex.io",
			force: false,
			maxBlockPayload: 123_444,
			maxTxPerBlock: 122,
			network: "testnet",
			overwriteConfig: false,
			peers: ["127.0.0.1"],
			premine: "12500000000000000",
			pubKeyHash: 168,
			rewardAmount: "200000000",
			rewardHeight: 23_000,
			symbol: "my",
			token: "myn",
			validators: 51,
			vendorFieldLength: 255,
			wif: 27,
		});

		existsSync.calledWith(configCore);
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();

		writeJSONSync.calledWith(
			match("crypto.json"),
			match({
				genesisBlock: {
					blockSignature: match.string,
					generatorPublicKey: match.string,
					height: 1,
					id: match.string,
					numberOfTransactions: 153,
					payloadHash: match.string,
					payloadLength: 4896,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					timestamp: match.number,
					totalAmount: BigNumber.make("12499999999999986"),
					totalFee: BigNumber.ZERO,
					transactions: match.array,
					version: 1,
				},
				milestones: [
					match({
						activeValidators: 51,
						address: match.object,
						block: match.object,
						blockTime: 9,
						epoch: match.string,
						height: 1,
						multiPaymentLimit: 256,
						reward: "0", // TODO: Check
						satoshi: match.object,
						vendorFieldLength: 255,
					}),
					match({
						activeValidators: 51,
						address: match.object,
						block: match.object,
						blockTime: 9,
						epoch: match.string,
						height: 23_000,
						multiPaymentLimit: 256,
						reward: "200000000",
						satoshi: match.object,
						vendorFieldLength: 255,
					}),
				],
				network: {
					client: { explorer: "myex.io", symbol: "my", token: "myn" },
					messagePrefix: "testnet message:\n",
					name: "testnet",
					nethash: match.string,
					pubKeyHash: 168,
					slip44: 1,
					wif: 27,
				},
			}),
			{ spaces: 4 },
		);
	});
});
