import { Console, describe } from "@arkecosystem/core-test-framework";
import envPaths from "env-paths";
import fs from "fs-extra";
import { join } from "path";
import prompts from "prompts";

import { Command } from "./network-generate";

describe<{
	cli: Console;
}>("NetworkGenerateCommand", ({ beforeEach, it, stub, assert, match }) => {
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
			.execute(Command);

		existsSync.calledWith(configCore);
		existsSync.calledWith(configCrypto);

		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);

		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env

		writeJSONSync.calledWith(
			match("crypto/milestones.json"),
			[
				match({
					activeDelegates: 47,
					aip11: true,
					block: {
						idFullSha256: true,
						maxPayload: 123_444,
						maxTransactions: 122,
						version: 0,
					},
					blocktime: 9,
					epoch: match.string,
					fees: {
						staticFees: {
							delegateRegistration: 2_500_000_000,
							delegateResignation: 2_500_000_000,
							multiPayment: 10_000_000,
							multiSignature: 500_000_000,
							transfer: 10_000_000,
							vote: 100_000_000,
						},
					},
					height: 1,
					multiPaymentLimit: 256,
					reward: "0",
					vendorFieldLength: 255,
				}),
				{
					height: 23_000,
					reward: 66_000,
				},
			],
			{ spaces: 4 },
		);
	});

	it("should throw if the core configuration destination already exists", async ({ cli }) => {
		stub(fs, "existsSync").returnValueOnce(true);

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
			`${configCore} already exists.`,
		);
	});

	it("should throw if the crypto configuration destination already exists", async ({ cli }) => {
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
			"120000000000",
			"47",
			"9",
			"122",
			"123444",
			"23000",
			"66000",
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
		existsSync.calledWith(configCrypto);
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
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
			"123444",
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
		existsSync.calledWith(configCrypto);
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
	});

	it("should generate a new configuration with additional flags", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blocktime: "9",
				delegates: "47",
				distribute: "true",
				epoch: "2020-11-04T00:00:00.000Z",
				explorer: "myex.io",
				feeDynamicBytesDelegateRegistration: 3,
				feeDynamicEnabled: true,
				feeDynamicBytesMultiSignature: 5,
				feeDynamicMinFeeBroadcast: 200,
				feeDynamicBytesDelegateResignation: 8,
				feeStaticDelegateRegistration: 3,
				coreDBHost: "127.0.0.1",
				feeStaticDelegateResignation: 8,
				coreDBPassword: "password",
				maxBlockPayload: "123444",
				coreDBDatabase: "database",
				maxTxPerBlock: "122",
				coreAPIPort: 3003,
				network: "testnet",
				coreDBPort: 3001,
				premine: "120000000000",
				coreDBUsername: "username",
				pubKeyHash: "168",
				coreMonitorPort: 3005,
				rewardAmount: "66000",
				coreP2PPort: 3002,
				rewardHeight: "23000",
				coreWebhooksPort: 3004,
				token: "myn",
				feeDynamicBytesMultiPayment: 7,
				vendorFieldLength: "64",
				feeDynamicBytesTransfer: 1,
				wif: "27",
				feeDynamicBytesVote: 4,
				symbol: "my",
				feeDynamicMinFeePool: 100,
				feeStaticMultiSignature: 5,
				feeStaticMultiPayment: 7,
				feeStaticTransfer: 1,
				feeStaticVote: 4,
				peers: "127.0.0.1:4444,127.0.0.2",
			})
			.execute(Command);

		existsSync.calledWith(configCore);
		existsSync.calledWith(configCrypto);
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env

		writeJSONSync.calledWith(
			match("crypto/milestones.json"),
			[
				match({
					activeDelegates: 47,
					aip11: true,
					block: {
						idFullSha256: true,
						maxPayload: 123_444,
						maxTransactions: 122,
						version: 0,
					},
					blocktime: 9,
					epoch: "2020-11-04T00:00:00.000Z",
					fees: {
						staticFees: {
							delegateRegistration: 3,
							delegateResignation: 8,
							multiPayment: 7,
							multiSignature: 5,
							transfer: 1,
							vote: 4,
						},
					},
					height: 1,
					multiPaymentLimit: 256,
					reward: "0",
					vendorFieldLength: 64,
				}),
				{
					height: 23_000,
					reward: 66_000,
				},
			],
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
		existsSync.calledWith(configCrypto);
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
	});

	it("should overwrite if overwriteConfig is set", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blocktime: "9",
				delegates: "47",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				overwriteConfig: "true",
				premine: "120000000000",
				pubKeyHash: "168",
				rewardAmount: "66000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				wif: "27",
			})
			.execute(Command);

		existsSync.neverCalled();
		existsSync.neverCalled();
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
	});

	it("should generate crypto on custom path", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blocktime: "9",
				configPath: "/path/to/config",
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
			.execute(Command);

		existsSync.calledWith("/path/to/config/testnet");
		existsSync.calledWith("/path/to/config/testnet/crypto");
		ensureDirSync.calledWith("/path/to/config/testnet");
		ensureDirSync.calledWith("/path/to/config/testnet/crypto");
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
	});

	it("should allow empty peers", async ({ cli }) => {
		const existsSync = stub(fs, "existsSync");
		const ensureDirSync = stub(fs, "ensureDirSync");
		const writeJSONSync = stub(fs, "writeJSONSync");
		const writeFileSync = stub(fs, "writeFileSync");

		await cli
			.withFlags({
				blocktime: "9",
				delegates: "47",
				distribute: "true",
				explorer: "myex.io",
				maxBlockPayload: "123444",
				maxTxPerBlock: "122",
				network: "testnet",
				peers: "",
				premine: "120000000000",
				pubKeyHash: "168",
				rewardAmount: "66000",
				rewardHeight: "23000",
				symbol: "my",
				token: "myn",
				wif: "27",
			})
			.execute(Command);

		existsSync.calledWith(configCore);
		existsSync.calledWith(configCrypto);
		ensureDirSync.calledWith(configCore);
		ensureDirSync.calledWith(configCrypto);
		writeJSONSync.calledTimes(8); // 5x Core + 2x Crypto + App
		writeFileSync.calledTimes(2); // index.ts && .env
	});
});
