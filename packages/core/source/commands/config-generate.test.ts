import { Console, describe } from "@arkecosystem/core-test-framework";
import { BigNumber } from "@arkecosystem/utils";
import envPaths from "env-paths";
import fs from "fs-extra";
import { join } from "path";
import prompts from "prompts";

import { Command } from "./config-generate";

describe<{
	cli: Console;
}>("ConfigGenerateCommand", ({ beforeEach, it, stub, assert, match }) => {
	const paths = envPaths("myn", { suffix: "core" });
	const configCore = join(paths.config, "testnet");
	const configCrypto = join(configCore, "crypto");

	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should generate a new configuration", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blockTime: "9",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				premine: "12500000000000000",
				pubKeyHash: "168",
				rewardAmount: "200000000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				validators: "51",
				wif: "27",
			})
			.execute(Command);

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
						reward: "0",
						satoshi: match.object,
						vendorFieldLength: 255,
					}),
					match({
						height: 23_000,
						reward: "200000000",
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

	it.skip("should throw if the core configuration destination already exists", async ({ cli }) => {
		stub(fs, "existsSync").returnValueOnce(true);

		await assert.rejects(
			() =>
				cli
					.withFlags({
						blockTime: "9",
						distribute: "true",
						explorer: "myex.io",
						maxBlockPayload: "123444",
						maxTxPerBlock: "122",
						network: "testnet",
						premine: "12500000000000000",
						pubKeyHash: "168",
						rewardAmount: "200000000",
						rewardHeight: "23000",
						symbol: "my",
						token: "myn",
						validators: "51",
						wif: "27",
					})
					.execute(Command),
			`${configCore} already exists.`,
		);
	});

	it.skip("should throw if the crypto configuration destination already exists", async ({ cli }) => {
		const retunValues = [false, true];
		stub(fs, "existsSync").callsFake(() => retunValues.shift());

		await assert.rejects(
			() =>
				cli
					.withFlags({
						blocktime: "9",
						delegates: "47",
						distribute: "true",
						explorer: "myex.io",
						maxBlockPayload: "123444",
						maxTxPerBlock: "122",
						network: "testnet",
						premine: "120000000000",
						pubKeyHash: "168",
						rewardAmount: "66000",
						rewardHeight: "23000",
						symbol: "my",
						token: "myn",
						wif: "27",
					})
					.execute(Command),
			`${configCrypto} already exists.`,
		);
	});

	it("should throw if the properties are not confirmed", async ({ cli }) => {
		prompts.inject([
			"testnet",
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
			true,
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
			true,
		]);

		await assert.rejects(() => cli.execute(Command), "Flag network is required.");
	});

	it("should throw if numeric property is Nan", async ({ cli }) => {
		prompts.inject([
			"testnet",
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
			true,
		]);

		await assert.rejects(() => cli.execute(Command), "Flag wif is required.");
	});

	it("should generate a new configuration if the properties are confirmed", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		prompts.inject([
			"testnet",
			"12500000000000000",
			"51",
			"9",
			"122",
			123_444,
			"23000",
			"200000000",
			168,
			"27",
			"myn",
			"my",
			"myex.io",
			true,
			true,
		]);

		await cli.execute(Command);

		existsSync.calledWith(configCore);
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});

	it("should generate a new configuration if the properties are confirmed and distribute is set to false", async ({
		cli,
	}) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		prompts.inject([
			"testnet",
			"120000000000",
			"47",
			"9",
			"122",
			123_444,
			"23000",
			"66000",
			168,
			"27",
			"myn",
			"my",
			"myex.io",
			false,
			true,
		]);

		await cli.withFlags({ distribute: false }).execute(Command);

		existsSync.calledWith(configCore);
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});

	it("should generate a new configuration with additional flags", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blockTime: "9",
				coreAPIPort: 3003,
				coreMonitorPort: 3005,
				coreP2PPort: 3002,
				coreWebhooksPort: 3004,
				distribute: "true",
				epoch: new Date("2020-11-04T00:00:00.000Z"),
				explorer: "myex.io",
				feeDynamicBytesDelegateRegistration: 3,
				feeDynamicBytesDelegateResignation: 8,
				feeDynamicBytesMultiPayment: 7,
				feeDynamicBytesMultiSignature: 5,
				feeDynamicBytesTransfer: 1,
				feeDynamicBytesVote: 4,
				feeDynamicEnabled: true,
				feeDynamicMinFeeBroadcast: 200,
				feeDynamicMinFeePool: 100,
				feeStaticDelegateRegistration: 3,
				feeStaticDelegateResignation: 8,
				feeStaticMultiPayment: 7,
				feeStaticMultiSignature: 5,
				feeStaticTransfer: 1,
				feeStaticVote: 4,
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				peers: "127.0.0.1:4444,127.0.0.2",
				premine: "120000000000",
				pubKeyHash: "168",
				rewardAmount: "66000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				validators: "47",
				vendorFieldLength: "64",
				wif: "27",
			})
			.execute(Command);

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
					numberOfTransactions: 141,
					payloadHash: match.string,
					payloadLength: 4512,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					timestamp: match.number,
					totalAmount: BigNumber.make("119999999983"),
					totalFee: BigNumber.ZERO,
					transactions: match.array,
					version: 1,
				},
				milestones: [
					match({
						activeValidators: 47,
						address: match.object,
						block: match.object,
						blockTime: 9,
						epoch: match.string,
						height: 1,
						multiPaymentLimit: 256,
						reward: "0", // TODO: Check
						satoshi: match.object,
						vendorFieldLength: 64,
					}),
					match({
						height: 23_000,
						reward: "66000",
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

	it("should generate a new configuration using force option", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				force: true,
				token: "myn",
			})
			.execute(Command);

		existsSync.calledWith(configCore);
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});

	it("should overwrite if overwriteConfig is set", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blockTime: "9",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				overwriteConfig: "true",
				premine: "12500000000000000",
				pubKeyHash: "168",
				rewardAmount: "200000000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				validators: "51",
				wif: "27",
			})
			.execute(Command);

		existsSync.neverCalled();
		ensureDirSync.calledWith(configCore);
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});

	it("should generate crypto on custom path", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blockTime: "9",
				configPath: "/path/to/config",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				premine: "12500000000000000",
				pubKeyHash: "168",
				rewardAmount: "200000000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				validators: "51",
				wif: "27",
			})
			.execute(Command);

		existsSync.calledWith("/path/to/config/testnet");
		ensureDirSync.calledWith("/path/to/config/testnet");
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});

	it.skip("should allow empty peers", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blockTime: "9",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				peers: "",
				premine: "12500000000000000",
				pubKeyHash: "168",
				rewardAmount: "200000000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				validators: "51",
				wif: "27",
			})
			.execute(Command);

		existsSync.calledWith("/path/to/config/testnet");
		ensureDirSync.calledWith("/path/to/config/testnet");
		writeJSONSync.calledTimes(5);
		writeFileSync.calledOnce();
	});
});
