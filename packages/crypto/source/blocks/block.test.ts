import { describe, TransactionFactory } from "@arkecosystem/core-test-framework";
import { BIP39 } from "../../../core-forger/source/methods/bip39";
import { Managers, Utils } from "../";
import { Block, BlockFactory, Deserializer, Serializer } from "../blocks";
import { Slots } from "../crypto";
import { configManager } from "../managers";
import * as networks from "../networks";
import { NetworkName } from "../types";
import ByteBuffer from "bytebuffer";
import { dummyBlock, dummyBlock2, dummyBlockSize } from "../../test/fixtures/block";
import { NetworkConfig } from "../interfaces";

const data = {
	id: "187940162505562345",
	blockSignature:
		"3045022100a6605198e0f590c88798405bc76748d84e280d179bcefed2c993e70cded2a5dd022008c7f915b89fc4f3250fc4b481abb753c68f30ac351871c50bd6cfaf151370e8",
	generatorPublicKey: "024c8247388a02ecd1de2a3e3fd5b7c61ecc2797fa3776599d558333ef1802d231",
	height: 10,
	numberOfTransactions: 0,
	payloadHash: "578e820911f24e039733b45e4882b73e301f813a0d2c31330dafda84534ffa23",
	payloadLength: 1,
	previousBlock: "12123",
	timestamp: 111150,
	reward: Utils.BigNumber.ONE,
	totalAmount: Utils.BigNumber.make(10),
	totalFee: Utils.BigNumber.ONE,
	transactions: [],
	version: 6,
};

const serialize = (object, includeSignature?: any) => {
	const serialized = Serializer.serialize(object, includeSignature);
	const buffer = new ByteBuffer(1024, true);
	buffer.append(serialized);
	buffer.flip();
	return buffer;
};

describe<{
	config: NetworkConfig;
}>("Block", ({ it, assert, beforeAll, afterAll, stub, each }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		configManager.setFromPreset("devnet");
	});

	afterAll((context) => configManager.setConfig(context.config));

	it("constructor - should store the data", () => {
		const block = BlockFactory.fromData(dummyBlock);

		assert.equal(block.data.blockSignature, dummyBlock.blockSignature);
		assert.equal(block.data.generatorPublicKey, dummyBlock.generatorPublicKey);
		assert.equal(block.data.height, dummyBlock.height);
		assert.equal(block.data.numberOfTransactions, dummyBlock.numberOfTransactions);
		assert.equal(block.data.payloadLength, dummyBlock.payloadLength);
		assert.equal(block.data.reward, dummyBlock.reward);
		assert.equal(block.data.timestamp, dummyBlock.timestamp);
		assert.equal(block.data.totalFee, dummyBlock.totalFee);
		assert.equal(block.data.version, dummyBlock.version);
	});

	it("constructor - should verify the block", () => {
		const block = BlockFactory.fromData(dummyBlock);

		assert.true(block.verification.verified);
	});

	it("constructor - should fail to verify the block", () => {
		const block = BlockFactory.fromData(data);

		assert.false(block.verification.verified);
	});

	it("constructor - should fail to verify a block with an invalid previous block", () => {
		const previousBlockBackup = dummyBlock.previousBlock;
		dummyBlock.previousBlock = "0000000000000000000";
		const block = BlockFactory.fromData(dummyBlock);

		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, "Failed to verify block signature");

		dummyBlock.previousBlock = previousBlockBackup;
	});

	it("constructor - should fail to verify a block with incorrect timestamp", () => {
		stub(Slots, "getTime").callsFake(() => dummyBlock.timestamp - 30);
		const block = BlockFactory.fromData(dummyBlock);
		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, "Invalid block timestamp");
	});

	it("constructor - should fail to verify a block with too much transactions", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 2,
			},
			reward: Utils.BigNumber.make(0),
		};
		const transactions = TransactionFactory.initialize()
			.transfer("DB4gFuDztmdGALMb8i1U4Z4R5SktxpNTAY", 10)
			.withNetwork("devnet")
			.withPassphrase("super cool passphrase")
			.create(210);

		const block = delegate.forge(transactions, optionsDefault);

		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, "Transactions length is too high");
	});

	it("constructor - should fail to verify a block with duplicate transactions", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 2,
			},
			reward: Utils.BigNumber.make(0),
		};
		const transactions = TransactionFactory.initialize()
			.transfer("DB4gFuDztmdGALMb8i1U4Z4R5SktxpNTAY", 10)
			.withNetwork("devnet")
			.withPassphrase("super cool passphrase")
			.create();

		const block = delegate.forge([transactions[0], transactions[0]], optionsDefault);

		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, `Encountered duplicate transaction: ${transactions[0].id}`);
	});

	it("constructor - should fail to verify a block with too large payload", () => {
		stub(configManager, "getMilestone").callsFake((height) => ({
			block: {
				version: 0,
				maxTransactions: 200,
				maxPayload: dummyBlockSize - 1,
			},
			reward: 200000000,
			vendorFieldLength: 64,
			epoch: "2017-03-21T13:00:00.000Z",
		}));
		let block = BlockFactory.fromData(dummyBlock);

		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, "Payload is too large");

		stub(configManager, "getMilestone").callsFake((height) => ({
			block: {
				version: 0,
				maxTransactions: 200,
				maxPayload: dummyBlockSize,
			},
			reward: 200000000,
			vendorFieldLength: 64,
			epoch: "2017-03-21T13:00:00.000Z",
		}));
		block = BlockFactory.fromData(dummyBlock);

		assert.true(block.verification.verified);
		assert.empty(block.verification.errors);
	});

	it("constructor - should verify a block with expiring transactions", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 100,
			},
			reward: Utils.BigNumber.make(0),
		};
		const transactions = TransactionFactory.initialize()
			.transfer("DB4gFuDztmdGALMb8i1U4Z4R5SktxpNTAY", 10)
			.withNetwork("devnet")
			.withTimestamp(optionsDefault.timestamp)
			.withPassphrase("super cool passphrase")
			.create();

		transactions[0].expiration = 102;

		const block = delegate.forge(transactions, optionsDefault);
		assert.true(block.verification.verified);
	});

	it("constructor - should fail to verify a block with expired transactions", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 100,
			},
			reward: Utils.BigNumber.make(0),
		};
		const transactions = TransactionFactory.initialize()
			.transfer("ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38", 10)
			.withNetwork("testnet")
			.withVersion(2)
			.withExpiration(52)
			.withPassphrase("super cool passphrase")
			.create();

		const block = delegate.forge(transactions, optionsDefault);
		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, `Encountered expired transaction: ${transactions[0].id}`);
	});

	it("constructor - should fail to verify a block with expired transaction timestamp", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 100,
			},
			reward: Utils.BigNumber.make(0),
		};

		const transactions = TransactionFactory.initialize()
			.transfer("ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38", 1)
			.withNetwork("testnet")
			.withVersion(1)
			.withTimestamp(optionsDefault.timestamp - 21601)
			.withPassphrase("super cool passphrase")
			.create();

		Managers.configManager.getMilestone().aip11 = false;
		const block = delegate.forge(transactions, optionsDefault);
		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, `Encountered expired transaction: ${transactions[0].id}`);
		Managers.configManager.getMilestone().aip11 = true;
	});

	it("constructor - should verify a block with future transaction timestamp if within blocktime", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 100,
			},
			reward: Utils.BigNumber.make(0),
		};

		const transactions = TransactionFactory.initialize()
			.transfer("ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38", 1)
			.withNetwork("testnet")
			.withVersion(1)
			.withTimestamp(
				optionsDefault.timestamp +
					3600 +
					configManager.getMilestone(optionsDefault.previousBlock.height).blocktime,
			)
			.withPassphrase("super cool passphrase")
			.create();

		Managers.configManager.getMilestone().aip11 = false;
		const block = delegate.forge(transactions, optionsDefault);
		assert.true(block.verification.verified);
		Managers.configManager.getMilestone().aip11 = true;
	});

	it("constructor - should fail to verify a block with future transaction timestamp", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "11111111",
				idHex: "11111111",
				height: 100,
			},
			reward: Utils.BigNumber.make(0),
		};

		const transactions = TransactionFactory.initialize()
			.transfer("ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38", 1)
			.withNetwork("testnet")
			.withVersion(1)
			.withTimestamp(
				optionsDefault.timestamp +
					3601 +
					configManager.getMilestone(optionsDefault.previousBlock.height).blocktime,
			)
			.withPassphrase("super cool passphrase")
			.create();

		Managers.configManager.getMilestone().aip11 = false;
		const block = delegate.forge(transactions, optionsDefault);
		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, `Encountered future transaction: ${transactions[0].id}`);
		Managers.configManager.getMilestone().aip11 = true;
	});

	it("constructor - should reject block with future transaction timestamp if milestone is not active", () => {
		const delegate = new BIP39("super cool passphrase");
		const optionsDefault = {
			timestamp: 12345689,
			previousBlock: {
				id: "c2fa2d400b4c823873d476f6e0c9e423cf925e9b48f1b5706c7e2771d4095538",
				height: 8999999,
			},
			reward: Utils.BigNumber.make(0),
		};

		const transactions = TransactionFactory.initialize()
			.transfer("ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38", 1)
			.withNetwork("mainnet")
			.withVersion(1)
			.withTimestamp(
				optionsDefault.timestamp +
					3601 +
					configManager.getMilestone(optionsDefault.previousBlock.height).blocktime,
			)
			.withPassphrase("super cool passphrase")
			.create();

		const block = delegate.forge(transactions, optionsDefault);
		assert.false(block.verification.verified);
		assert.containValues(block.verification.errors, `Encountered future transaction: ${transactions[0].id}`);
	});

	it("constructor - should fail to verify a block if error is thrown", () => {
		const errorMessage = "Very very, very bad error";
		stub(Slots, "getTime").callsFake((height) => {
			throw errorMessage;
		});
		const block = BlockFactory.fromData(dummyBlock);

		assert.false(block.verification.verified);
		assert.equal(block.verification.errors, [errorMessage]);
	});

	it("constructor - should fail to verify a block with invalid S in signature (not low S value)", () => {
		const block = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c",
		});

		assert.true(block.verification.verified);
		assert.equal(block.verification.errors, []);

		const blockHighS = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220afe9ef0f2ab672fd702d898915da6858ef2e0d8e18612058c570fc4f9e371835",
		});

		assert.false(blockHighS.verification.verified);
		assert.equal(blockHighS.verification.errors, ["Failed to verify block signature"]);
	});

	it("constructor - should fail to verify a block with wrong signature length", () => {
		const block = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c",
		});

		assert.true(block.verification.verified);
		assert.equal(block.verification.errors, []);

		const blockInvalidSignatureLength = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3046022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c00",
		});

		assert.false(blockInvalidSignatureLength.verification.verified);
		assert.equal(blockInvalidSignatureLength.verification.errors, ["Failed to verify block signature"]);
	});

	it("constructor - should fail to verify a block with negative R", () => {
		const block = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c",
		});

		assert.true(block.verification.verified);
		assert.equal(block.verification.errors, []);

		const blockInvalidR = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"30440220c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c",
		});

		assert.false(blockInvalidR.verification.verified);
		assert.equal(blockInvalidR.verification.errors, ["Failed to verify block signature"]);
	});

	it("constructor - should fail to verify a block with long form signature", () => {
		const block = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"3045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c",
		});

		assert.true(block.verification.verified);
		assert.equal(block.verification.errors, []);

		const blockLongFormSig = BlockFactory.fromData({
			id: "62b348a7aba2c60506929eec1311eaecb48ef232d4b154db2ede3f5e53700be9",
			version: 0,
			timestamp: 102041016,
			height: 5470549,
			reward: Utils.BigNumber.make("200000000"),
			previousBlock: "2d270cae7e2bd9da27f6160b521859820f2c90315672e1774733bdd6415abb86",
			numberOfTransactions: 0,
			totalAmount: Utils.BigNumber.ZERO,
			totalFee: Utils.BigNumber.ZERO,
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			generatorPublicKey: "026a423b3323de175dd82788c7eab57850c6a37ea6a470308ebadd7007baf8ceb3",
			blockSignature:
				"30820045022100c92d7d0c3ea2ba72576f6494a81fc498d0420286896f806a7ead443d0b5d89720220501610f0d5498d028fd27676ea2597a5cb80cf5896e77fe2fa61623d31ff290c0239111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
		});

		assert.false(blockLongFormSig.verification.verified);
		assert.equal(blockLongFormSig.verification.errors, ["Failed to verify block signature"]);
	});

	it("constructor - should construct the block (header only)", () => {
		const block = BlockFactory.fromHex(dummyBlock2.serialized);
		const actual = block.toJson();

		assert.equal(actual.version, dummyBlock2.data.version);
		assert.equal(actual.timestamp, dummyBlock2.data.timestamp);
		assert.equal(actual.height, dummyBlock2.data.height);
		assert.equal(actual.previousBlock, dummyBlock2.data.previousBlock);
		assert.equal(actual.numberOfTransactions, dummyBlock2.data.numberOfTransactions);
		assert.equal(actual.totalAmount, dummyBlock2.data.totalAmount.toFixed());
		assert.equal(actual.totalFee, dummyBlock2.data.totalFee.toFixed());
		assert.equal(actual.reward, dummyBlock2.data.reward.toFixed());
		assert.equal(actual.payloadLength, dummyBlock2.data.payloadLength);
		assert.equal(actual.payloadHash, dummyBlock2.data.payloadHash);
		assert.equal(actual.generatorPublicKey, dummyBlock2.data.generatorPublicKey);
		assert.equal(actual.blockSignature, dummyBlock2.data.blockSignature);
		assert.empty(actual.transactions);
	});

	it("constructor - should construct the block (full)", () => {
		const block = BlockFactory.fromHex(dummyBlock2.serializedFull);
		const actual = block.toJson();

		assert.equal(actual.version, dummyBlock2.data.version);
		assert.equal(actual.timestamp, dummyBlock2.data.timestamp);
		assert.equal(actual.height, dummyBlock2.data.height);
		assert.equal(actual.previousBlock, dummyBlock2.data.previousBlock);
		assert.equal(actual.numberOfTransactions, dummyBlock2.data.numberOfTransactions);
		assert.equal(actual.totalAmount, dummyBlock2.data.totalAmount.toFixed());
		assert.equal(actual.totalFee, dummyBlock2.data.totalFee.toFixed());
		assert.equal(actual.reward, dummyBlock2.data.reward.toFixed());
		assert.equal(actual.payloadLength, dummyBlock2.data.payloadLength);
		assert.equal(actual.payloadHash, dummyBlock2.data.payloadHash);
		assert.equal(actual.generatorPublicKey, dummyBlock2.data.generatorPublicKey);
		assert.equal(actual.blockSignature, dummyBlock2.data.blockSignature);
		assert.length(actual.transactions, 7);
	});

	it("getHeader - returns the block data without the transactions", () => {
		stub(Block.prototype as any, "verify").callsFake(() => ({ verified: true }));

		const data2 = { ...data };
		const header = BlockFactory.fromData(data2).getHeader();
		const bignumProperties = ["reward", "totalAmount", "totalFee"];

		for (const key of Object.keys(data)) {
			if (key !== "transactions") {
				if (bignumProperties.includes(key)) {
					assert.equal(header[key], Utils.BigNumber.make(data2[key]));
				} else {
					assert.equal(header[key], data2[key]);
				}
			}
		}

		assert.false(header.hasOwnProperty("transactions"));
	});

	it("serialize - version is serialized as a TODO", () => {
		assert.equal(serialize(data).readUint32(0), data.version);
	});

	it("serialize - timestamp is serialized as a UInt32", () => {
		assert.equal(serialize(data).readUint32(4), data.timestamp);
	});

	it("serialize - height is serialized as a UInt32", () => {
		assert.equal(serialize(data).readUint32(8), data.height);
	});

	it("serialize - if `previousBlock` exists is serialized as hexadecimal", () => {
		const dataWithPreviousBlock: any = Object.assign({}, data, {
			previousBlock: "1234",
		});
		assert.equal(
			serialize(dataWithPreviousBlock).slice(12, 20).toString("hex"),
			dataWithPreviousBlock.previousBlockHex,
		);
	});

	it("serialize - if `previousBlock` does not exist 8 bytes are added, as padding", () => {
		const dataWithoutPreviousBlock = Object.assign({}, data);
		delete dataWithoutPreviousBlock.previousBlock;
		assert.equal(serialize(dataWithoutPreviousBlock).slice(12, 20).toString("hex"), "0000000000000000");
	});

	it("serialize - number of transactions is serialized as a UInt32", () => {
		assert.equal(serialize(data).readUint32(20), data.numberOfTransactions);
	});

	it("serialize - `totalAmount` of transactions is serialized as a UInt64", () => {
		assert.equal(serialize(data).readUint64(24).toNumber(), +data.totalAmount);
	});

	it("serialize - `totalFee` of transactions is serialized as a UInt64", () => {
		assert.equal(serialize(data).readUint64(32).toNumber(), +data.totalFee);
	});

	it("serialize - `reward` of transactions is serialized as a UInt64", () => {
		assert.equal(serialize(data).readUint64(40).toNumber(), +data.reward);
	});

	it("serialize - `payloadLength` of transactions is serialized as a UInt32", () => {
		assert.equal(serialize(data).readUint32(48), data.payloadLength);
	});

	it("serialize - `payloadHash` of transactions is appended, using 32 bytes, as hexadecimal", () => {
		assert.equal(
			serialize(data)
				.slice(52, 52 + 32)
				.toString("hex"),
			data.payloadHash,
		);
	});

	it("serialize - `generatorPublicKey` of transactions is appended, using 33 bytes, as hexadecimal", () => {
		assert.equal(
			serialize(data)
				.slice(84, 84 + 33)
				.toString("hex"),
			data.generatorPublicKey,
		);
	});

	it("serialize - if the `blockSignature` is not included is not serialized", () => {
		const data2 = { ...data };
		delete data2.blockSignature;
		assert.equal(serialize(data2).limit, 117);
	});

	it("serialize - if the `blockSignature` is not included is not serialized, even when the `includeSignature` parameter is true", () => {
		const data2 = { ...data };
		delete data2.blockSignature;
		assert.equal(serialize(data2, true).limit, 117);
	});

	it("serialize - if the `blockSignature` is included is serialized", () => {
		assert.equal(serialize(data).slice(117, 188).toString("hex"), data.blockSignature);
	});

	it("serialize - if the `blockSignature` is included is serialized unless the `includeSignature` parameter is false", () => {
		assert.equal(serialize(data, false).limit, 117);
	});

	each(
		"serializeWithTransactions - genesis block - %s",
		({ dataset }) => {
			const {
				network,
				length,
			}: {
				network: NetworkName;
				length: number;
			} = dataset;

			configManager.setFromPreset(network);
			configManager.getMilestone().aip11 = false;

			const block = BlockFactory.fromJson(networks[network].genesisBlock);

			assert.equal(block.serialized.length, length);
			assert.true(block.verifySignature());
			configManager.getMilestone().aip11 = network === "testnet";
		},
		[
			["mainnet", 468048],
			["devnet", 14492],
			["testnet", 46488],
		],
	);

	it("serializeWithTransactions - should validate hash", () => {
		// @ts-ignore
		const s = Serializer.serializeWithTransactions(dummyBlock).toString("hex");
		const serialized =
			"00000000006fb50300db1a002b324b8b33a85802070000000049d97102000000801d2c040000000000c2eb0b00000000e0000000de56269cae3ab156f6979b94a04c30b82ed7d6f9a97d162583c98215c18c65db03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3730450221008c59bd2379061ad3539b73284fc0bbb57dbc97efd54f55010ba3f198c04dde7402202e482126b3084c6313c1378d686df92a3e2ef5581323de11e74fe07eeab339f3990000009a0000009a0000009a000000990000009a00000099000000ff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37809698000000000000006d7c4d00000000000000001e46550551e12d2531ea9d2968696b75f68ae7f29530440220714c2627f0e9c3bd6bf13b8b4faa5ec2d677694c27f580e2f9e3875bde9bc36f02201c33faacab9eafd799d9ceecaa153e3b87b4cd04535195261fd366e552652549ff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3780969800000000000000f1536500000000000000001e46550551e12d2531ea9d2968696b75f68ae7f2953045022100e6039f810684515c0d6b31039040a76c98f3624b6454cb156a0a2137e5f8dba7022001ada19bcca5798e1c7cc8cc39bab5d4019525e3d72a42bd2c4129352b8ead87ff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37809698000000000000002f685900000000000000001e46550551e12d2531ea9d2968696b75f68ae7f2953045022100c2b5ef772b36e468e95ec2e457bfaba7bad0e13b3faf57e229ff5d67a0e017c902202339664595ea5c70ce20e4dd182532f7fa385d86575b0476ff3eda9f9785e1e9ff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3780969800000000000000105e5f00000000000000001e46550551e12d2531ea9d2968696b75f68ae7f29530450221009ceb56688705e6b12000bde726ca123d84982231d7434f059612ff5f987409c602200d908667877c902e7ba35024951046b883e0bce9103d4717928d94ecc958884aff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37809698000000000000008c864700000000000000001e46550551e12d2531ea9d2968696b75f68ae7f29530440220464beac6d49943ad8afaac4fdc863c9cd7cf3a84f9938c1d7269ed522298f11a02203581bf180de1966f86d914afeb005e1e818c9213514f96a34e1391c2a08514faff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac3780969800000000000000d2496b00000000000000001e46550551e12d2531ea9d2968696b75f68ae7f2953045022100c7b40d7134d909762d18d6bfb7ac1c32be0ee8c047020131f499faea70ca0b2b0220117c0cf026f571f5a85e3ae800a6fd595185076ff38e64c7a4bd14f34e1d4dd1ff011e00006fb50303287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37809698000000000000004e725300000000000000001e46550551e12d2531ea9d2968696b75f68ae7f295304402206a4a8e4e6918fbc15728653b117f51db716aeb04e5ee1de047f80b0476ee4efb02200f486dfaf0def3f3e8636d46ee75a2c07de9714ce4283a25fde9b6218b5e7923";
		const block1 = BlockFactory.fromData(dummyBlock);
		const block2 = BlockFactory.fromData(Deserializer.deserialize(Buffer.from(serialized, "hex")).data);

		assert.equal(s, serialized);
		assert.true(block1.verification.verified);
		assert.true(block2.verification.verified);
	});

	it.skip("should reorder correctly transactions in deserialization", () => {
		configManager.setFromPreset("mainnet");

		const issue = {
			version: 0,
			timestamp: 25029544,
			height: 3084276,
			previousBlockHex: "63b315f3663e4299",
			previousBlock: "7184109965722665625",
			numberOfTransactions: 2,
			totalAmount: Utils.BigNumber.make(0),
			totalFee: Utils.BigNumber.make(600000000),
			reward: Utils.BigNumber.make(200000000),
			payloadLength: 64,
			payloadHash: "c2fa2d400b4c823873d476f6e0c9e423cf925e9b48f1b5706c7e2771d4095538",
			generatorPublicKey: "02fa6902e91e127d6d3410f6abc271a79ae24029079caa0db5819757e3c1c1c5a4",
			blockSignature:
				"30440220543f71d6f6445b703459b4f91d2c6f2446cbe6669e9c9008b1c77cc57073af2402206036fee3b434ffd5a31a579dd5b514a1c6384962291fda27b2463de903422834",
			id: "11773170219525190460",
			transactions: [
				{
					id: "7a1a43098cd253db395514220f69e3b99afaabb2bfcf5ecfa3b99727b367344b",
					network: 0x17,
					type: 1,
					timestamp: 25028279,
					fee: Utils.BigNumber.make(500000000),
					amount: Utils.BigNumber.make(0),
					senderPublicKey: "02aadc3e0993c1d3447db27741745eb9c2c6522cccf02fc8efe3bf2d49708243dd",
					signature:
						"3044022071f4f5281ba7be76e43df4ea9e74f820da761e1f9f3b168b3a6e42c55ccf343a02203629d94845709e31be20943e2cd26637f0d8ccfb4a59764d45c161a942def069",
					asset: {
						signature: {
							publicKey: "02135e2ebd97d1f1ab5141b4269defc6e5650848062c40baaf869d72571526e6c6",
						},
					},
				},
				{
					type: 3,
					network: 0x17,
					timestamp: 25028325,
					senderPublicKey: "02aadc3e0993c1d3447db27741745eb9c2c6522cccf02fc8efe3bf2d49708243dd",
					fee: Utils.BigNumber.make(100000000),
					amount: Utils.BigNumber.make(0),
					asset: {
						votes: ["+020431436cf94f3c6a6ba566fe9e42678db8486590c732ca6c3803a10a86f50b92"],
					},
					signature:
						"3045022100be28bdd7dc7117de903eccf97e3afbe87e1a32ee25b0b9bf814b35c6773ed51802202c8d62e708aa7afc08dbfcfd4640d105fe97337fb6145a8d916f2ce11c920255",
					recipientId: "ANYiQJSPSoDT8U9Quh5vU8timD2RM7RS38",
					id: "bace38ea544678f951cdd4abc269be24b4f5bab925ff6d5b480657952eb5aa65",
				},
			],
		};

		const block = BlockFactory.fromData(issue);
		assert.equal(block.data.id, issue.id);
		assert.equal(block.transactions[0].id, issue.transactions[1].id);

		configManager.setFromPreset("devnet");
	});

	it("[apply v1 fix] should not process a common block", () => {
		const mock = {
			id: "187940162505562345",
			blockSignature:
				"3045022100a6605198e0f590c88798405bc76748d84e280d179bcefed2c993e70cded2a5dd022008c7f915b89fc4f3250fc4b481abb753c68f30ac351871c50bd6cfaf151370e8",
			generatorPublicKey: "024c8247388a02ecd1de2a3e3fd5b7c61ecc2797fa3776599d558333ef1802d231",
			height: 10,
			numberOfTransactions: 0,
			payloadHash: "578e820911f24e039733b45e4882b73e301f813a0d2c31330dafda84534ffa23",
			payloadLength: 1,
			previousBlock: "12123",
			timestamp: 111150,
			reward: Utils.BigNumber.ONE,
			totalAmount: Utils.BigNumber.make(10),
			totalFee: Utils.BigNumber.ONE,
			transactions: [],
			version: 6,
		};
		const blk = BlockFactory.fromData(mock);
		assert.equal(blk.data.id, mock.id);
	});

	it("[apply v1 fix] should process a matching id", () => {
		const mock2 = {
			id: "8225244493039935740",
			blockSignature:
				"3045022100a6605198e0f590c88798405bc76748d84e280d179bcefed2c993e70cded2a5dd022008c7f915b89fc4f3250fc4b481abb753c68f30ac351871c50bd6cfaf151370e8",
			generatorPublicKey: "024c8247388a02ecd1de2a3e3fd5b7c61ecc2797fa3776599d558333ef1802d231",
			height: 10,
			numberOfTransactions: 0,
			payloadHash: "578e820911f24e039733b45e4882b73e301f813a0d2c31330dafda84534ffa23",
			payloadLength: 1,
			previousBlock: "12123",
			timestamp: 111150,
			reward: Utils.BigNumber.ONE,
			totalAmount: Utils.BigNumber.make(10),
			totalFee: Utils.BigNumber.ONE,
			transactions: [],
			version: 6,
		};
		const blk2 = BlockFactory.fromData(mock2);
		assert.not.equal(blk2.data.id, mock2.id);
	});
});
