import { describe, Generators } from "@arkecosystem/core-test-framework";
import { Enums, Errors, Utils } from "..";
import { Hash } from "../crypto";
import {
	InvalidTransactionBytesError,
	TransactionSchemaError,
	TransactionVersionError,
	UnkownTransactionError,
} from "../errors";
import { Address, Keys } from "../identities";
import { IKeyPair, ITransaction, ITransactionData } from "../interfaces";
import { configManager } from "../managers";
import { TransactionFactory, Utils as TransactionUtils, Verifier } from "./";
import { BuilderFactory } from "./builders";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import ByteBuffer from "bytebuffer";
import { legacyMultiSignatureRegistration } from "../../test/fixtures/transaction";

const builderWith = (hasher: (buffer: Buffer, keys: IKeyPair) => string) => {
	const keys = Keys.fromPassphrase("secret");

	const builder = BuilderFactory.transfer()
		.senderPublicKey(keys.publicKey)
		.recipientId(Address.fromPublicKey(keys.publicKey))
		.amount("10000")
		.fee("50000000");

	const buffer = TransactionUtils.toHash(builder.data, {
		excludeSignature: true,
	});

	builder.data.signature = hasher(buffer, keys);

	return builder;
};

const checkCommonFields = (assert, deserialized: ITransaction, expected) => {
	const fieldsToCheck = ["version", "network", "type", "senderPublicKey", "fee", "amount"];
	if (deserialized.data.version === 1) {
		fieldsToCheck.push("timestamp");
	} else {
		fieldsToCheck.push("typeGroup");
		fieldsToCheck.push("nonce");
	}

	for (const field of fieldsToCheck) {
		assert.equal(deserialized.data[field].toString(), expected[field].toString());
	}

	assert.true(Verifier.verify(deserialized.data));
};

describe("Transaction serializer / deserializer", ({ it, assert }) => {
	it("[version 1] - ser/deserialize - transfer - should ser/deserialize giving back original fields", () => {
		configManager.getMilestone().aip11 = false;

		const transfer = BuilderFactory.transfer()
			.recipientId("D5q7YfEFDky1JJVQQEy4MGyiUhr5cGg47F")
			.amount("10000")
			.fee("50000000")
			.timestamp(148354645)
			.vendorField("cool vendor field")
			.network(30)
			.sign("dummy passphrase")
			.getStruct();
		const serialized = TransactionFactory.fromData(transfer).serialized.toString("hex");
		assert.equal(
			serialized,
			"ff011e0055b6d70802a47a2f594635737d2ce9898680812ff7fa6aaa64ddea1360474c110e9985a08780f0fa020000000011636f6f6c2076656e646f72206669656c641027000000000000000000001e07917aa042bf600339e13ed57c5364a71eebb8c33044022013287e3d1713e1a407068af0054412dc523476a8786823b8744d2ba8a3daa144022059f30896ad610aecb145275bd89de58ddaeb7c703d31fdab2a02efa3ea4ae1bd",
		);

		const deserialized = Deserializer.deserialize(serialized);

		checkCommonFields(assert, deserialized, transfer);

		assert.equal(deserialized.data.vendorField, transfer.vendorField);
		assert.equal(deserialized.data.recipientId, transfer.recipientId);
	});

	it("[version 1] - ser/deserialize - transfer - should ser/deserialize with long vendorfield when vendorFieldLength=255 milestone is active", () => {
		configManager.getMilestone().aip11 = false;

		configManager.getMilestone().vendorFieldLength = 255;

		const transferWithLongVendorfield = BuilderFactory.transfer()
			.recipientId("D5q7YfEFDky1JJVQQEy4MGyiUhr5cGg47F")
			.amount("10000")
			.fee("50000000")
			.timestamp(148354645)
			.vendorField("y".repeat(255))
			.network(30)
			.sign("dummy passphrase")
			.getStruct();

		const serialized = TransactionUtils.toBytes(transferWithLongVendorfield);
		assert.equal(
			serialized.toString("hex"),
			"ff011e0055b6d70802a47a2f594635737d2ce9898680812ff7fa6aaa64ddea1360474c110e9985a08780f0fa0200000000ff7979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979797979791027000000000000000000001e07917aa042bf600339e13ed57c5364a71eebb8c330450221008c7278bf5a3a0f79afade499f3c2c574a54d936708e078408030e222fb4aaea102203559198c9b99a4fe679e40c48c8d25390e5bdf42ec2aafe6a2c85ab637e34748",
		);
		const deserialized = TransactionFactory.fromBytes(serialized);

		assert.true(deserialized.verified);
		assert.equal(deserialized.data.vendorField.length, 255);
		assert.equal(deserialized.data.vendorField, "y".repeat(255));

		configManager.getMilestone().vendorFieldLength = 64;
	});

	it("[version 1] - ser/deserialize - transfer - should not ser/deserialize long vendorfield when vendorFieldLength=255 milestone is not active", () => {
		configManager.getMilestone().aip11 = false;

		const transferWithLongVendorfield = BuilderFactory.transfer()
			.recipientId("D5q7YfEFDky1JJVQQEy4MGyiUhr5cGg47F")
			.amount("10000")
			.fee("50000000")
			.network(30)
			.sign("dummy passphrase")
			.getStruct();

		transferWithLongVendorfield.vendorField = "y".repeat(255);
		assert.throws(
			() => {
				const serialized = TransactionUtils.toBytes(transferWithLongVendorfield);
				TransactionFactory.fromBytes(serialized);
			},
			(err) => err instanceof TransactionSchemaError,
		);
	});

	it("[version 1] - ser/deserialize - delegate registration - should ser/deserialize giving back original fields", () => {
		configManager.getMilestone().aip11 = false;

		const delegateRegistration = BuilderFactory.delegateRegistration()
			.usernameAsset("homer")
			.timestamp(148354645)
			.network(30)
			.sign("dummy passphrase")
			.getStruct();

		const serialized = TransactionFactory.fromData(delegateRegistration).serialized.toString("hex");
		assert.equal(
			serialized,
			"ff011e0255b6d70802a47a2f594635737d2ce9898680812ff7fa6aaa64ddea1360474c110e9985a08700f90295000000000005686f6d6572304402207752a833bd57722134a07796a44eb2a132e37a873e6fdb51c1bf217116f6293d02204ee141716b142e49e62488ee9c97458a38942177a7ef8f7737b702c896245655",
		);
		const deserialized = Deserializer.deserialize(serialized);

		checkCommonFields(assert, deserialized, delegateRegistration);

		assert.equal(deserialized.data.asset, delegateRegistration.asset);
	});

	it("[version 1] - ser/deserialize - vote - should ser/deserialize giving back original fields", () => {
		configManager.getMilestone().aip11 = false;

		const vote = BuilderFactory.vote()
			.votesAsset(["+02bcfa0951a92e7876db1fb71996a853b57f996972ed059a950d910f7d541706c9"])
			.timestamp(148354645)
			.fee("50000000")
			.network(30)
			.sign("dummy passphrase")
			.getStruct();

		const serialized = TransactionFactory.fromData(vote).serialized.toString("hex");
		assert.equal(
			serialized,
			"ff011e0355b6d70802a47a2f594635737d2ce9898680812ff7fa6aaa64ddea1360474c110e9985a08780f0fa020000000000010102bcfa0951a92e7876db1fb71996a853b57f996972ed059a950d910f7d541706c93045022100b80680e9368e830663c10e52ab69b4adbbf4d55b9701a301cec5849640109fb102202c42de6a55792a16c8394d0981a852b0dea314b14378cdd3b4026e6b2e840074",
		);
		const deserialized = Deserializer.deserialize(serialized);

		checkCommonFields(assert, deserialized, vote);

		assert.equal(deserialized.data.asset, vote.asset);
	});

	it.skip("ser/deserialize - multi signature (LEGACY) - should ser/deserialize a legacy multisig registration", () => {
		configManager.getMilestone().aip11 = false;

		const deserialized = TransactionFactory.fromHex(legacyMultiSignatureRegistration.serialized);

		assert.equal(deserialized.id, legacyMultiSignatureRegistration.data.id);
		assert.matchesObject(deserialized.toJson(), legacyMultiSignatureRegistration.data as any);
	});

	it("[version 1] - ser/deserialize - multi signature - should ser/deserialize a multisig registration", () => {
		configManager.getMilestone().aip11 = false;

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const participant1 = Keys.fromPassphrase("secret 1");
		const participant2 = Keys.fromPassphrase("secret 2");
		const participant3 = Keys.fromPassphrase("secret 3");

		const multiSignatureRegistration = BuilderFactory.multiSignature()
			.senderPublicKey(participant1.publicKey)
			.network(23)
			.timestamp(148354645)
			.participant(participant1.publicKey)
			.participant(participant2.publicKey)
			.participant(participant3.publicKey)
			.min(3)
			.multiSign("secret 1", 0)
			.multiSign("secret 2", 1)
			.multiSign("secret 3", 2)
			.sign("secret 1")
			.getStruct();

		const transaction = TransactionFactory.fromData(multiSignatureRegistration);
		assert.equal(
			transaction.serialized.toString("hex"),
			"ff02170100000004000000000000000000039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f220094357700000000000303039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22028d3611c4f32feca3e6713992ae9387e18a0e01954046511878fe078703324dc0021d3932ab673230486d0f956d05b9e88791ee298d9af2d6df7d9ed5bb861c92dd5e3b61f2d6a2589b9abb4ed1dfd7253a1d2ac586d383a8a17237928d4648cd6d3ff1c8b025c7e150282f73ecd8a13f86254b508940ebb23d4f6f4f473b3a15de007dbeace4f00c9d5961a6bd65b4dbc6ea2b4c6278adc351e6da9eeba69478a7784e17754eff20a3ccd68cd48d87847d40768785852594e73cc6b01105064b6b5701d1c435978899abafd485f5e2dfe737781368efc1c4d02f4009a650849a434b923b2e6b79164181df493c9a05e2e6664c2ac0059d9194c792c1b1a85695b6215e0286b1d2b6abf7ca5090c66598e898aa08ba2de90dbd2ae9fe728b8b2d29504c6ad5a96ca1f0365e0390d0cf508550ded10a5e111db5bbf2b0f87972215ee69f9f",
		);
		const deserialized = TransactionFactory.fromBytes(transaction.serialized);

		assert.true(transaction.isVerified);
		assert.true(deserialized.isVerified);
		assert.equal(deserialized.data.asset, multiSignatureRegistration.asset);
		assert.equal(transaction.data.signatures, deserialized.data.signatures);
		checkCommonFields(assert, deserialized, multiSignatureRegistration);
	});

	it("[version 1] - ser/deserialize - multi signature - should fail to verify", () => {
		configManager.getMilestone().aip11 = false;

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const participant1 = Keys.fromPassphrase("secret 1");
		const participant2 = Keys.fromPassphrase("secret 2");
		const participant3 = Keys.fromPassphrase("secret 3");

		const multiSignatureRegistration = BuilderFactory.multiSignature()
			.senderPublicKey(participant1.publicKey)
			.network(23)
			.timestamp(148354645)
			.participant(participant1.publicKey)
			.participant(participant2.publicKey)
			.participant(participant3.publicKey)
			.min(3)
			.multiSign("secret 1", 0)
			.multiSign("secret 2", 1)
			.multiSign("secret 3", 2)
			.sign("secret 1")
			.getStruct();

		const transaction = TransactionFactory.fromData(multiSignatureRegistration);
		configManager.getMilestone().aip11 = false;
		assert.false(transaction.verify());
		configManager.getMilestone().aip11 = true;
		assert.true(transaction.verify());
	});

	it("[version 1] - ser/deserialize - multi signature - should not deserialize a malformed signature", () => {
		configManager.getMilestone().aip11 = false;

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const participant1 = Keys.fromPassphrase("secret 1");
		const participant2 = Keys.fromPassphrase("secret 2");
		const participant3 = Keys.fromPassphrase("secret 3");

		const multiSignatureRegistration = BuilderFactory.multiSignature()
			.senderPublicKey(participant1.publicKey)
			.network(23)
			.timestamp(148354645)
			.participant(participant1.publicKey)
			.participant(participant2.publicKey)
			.participant(participant3.publicKey)
			.min(3)
			.multiSign("secret 1", 0)
			.multiSign("secret 2", 1)
			.multiSign("secret 3", 2)
			.sign("secret 1")
			.getStruct();

		const transaction = TransactionFactory.fromData(multiSignatureRegistration);
		transaction.serialized = transaction.serialized.slice(0, transaction.serialized.length - 2);

		assert.throws(
			() => TransactionFactory.fromBytes(transaction.serialized),
			(err) => err instanceof InvalidTransactionBytesError,
		);
	});

	it("[version 2] ser/deserialize - delegate resignation - should ser/deserialize giving back original fields", () => {
		configManager.getMilestone().aip11 = true;
		const delegateResignation = BuilderFactory.delegateResignation()
			.fee("50000000")
			.network(23)
			.sign("dummy passphrase")
			.getStruct();

		const serialized = TransactionFactory.fromData(delegateResignation).serialized.toString("hex");
		const deserialized = Deserializer.deserialize(serialized);

		checkCommonFields(assert, deserialized, delegateResignation);
	});

	it("[version 2] ser/deserialize - delegate resignation - should fail to verify", () => {
		configManager.getMilestone().aip11 = true;
		const delegateResignation = BuilderFactory.delegateResignation()
			.fee("50000000")
			.network(23)
			.sign("dummy passphrase")
			.build();

		configManager.getMilestone().aip11 = false;
		assert.false(delegateResignation.verify());
		configManager.getMilestone().aip11 = true;
		assert.true(delegateResignation.verify());
	});

	it("[version 2] ser/deserialize - multi payment - should ser/deserialize giving back original fields", () => {
		configManager.getMilestone().aip11 = true;
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const multiPayment = BuilderFactory.multiPayment()
			.fee("50000000")
			.network(23)
			.addPayment("AW5wtiimZntaNvxH6QBi7bBpH2rDtFeD8C", "1555")
			.addPayment("AW5wtiimZntaNvxH6QBi7bBpH2rDtFeD8C", "5000")
			.vendorField("Multipayment")
			.sign("dummy passphrase")
			.getStruct();

		const serialized = TransactionFactory.fromData(multiPayment).serialized.toString("hex");
		const deserialized = Deserializer.deserialize(serialized);

		checkCommonFields(assert, deserialized, multiPayment);
	});

	it("[version 2] ser/deserialize - multi payment - should fail to verify", () => {
		configManager.getMilestone().aip11 = true;
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const multiPayment = BuilderFactory.multiPayment()
			.fee("50000000")
			.network(23)
			.addPayment("AW5wtiimZntaNvxH6QBi7bBpH2rDtFeD8C", "1555")
			.addPayment("AW5wtiimZntaNvxH6QBi7bBpH2rDtFeD8C", "5000")
			.sign("dummy passphrase")
			.build();

		configManager.getMilestone().aip11 = false;
		assert.false(multiPayment.verify());
		configManager.getMilestone().aip11 = true;
		assert.true(multiPayment.verify());
	});

	it("[version 2] ser/deserialize - multi payment - should fail if more than hardcoded maximum of payments", () => {
		configManager.getMilestone().aip11 = true;
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const multiPayment = BuilderFactory.multiPayment().fee("50000000").network(23);

		for (let i = 0; i < configManager.getMilestone().multiPaymentLimit; i++) {
			multiPayment.addPayment(Address.fromPassphrase(`recipient-${i}`), "1");
		}

		assert.throws(
			() => multiPayment.addPayment(Address.fromPassphrase("recipientBad"), "1"),
			(err) => err instanceof Errors.MaximumPaymentCountExceededError,
		);

		const transaction = multiPayment.sign("dummy passphrase").build();
		assert.true(transaction.verify());
		assert.true(TransactionFactory.fromBytes(transaction.serialized, true).verify());
	});

	it("[version 2] ser/deserialize - multi payment - should fail if recipient on different network", () => {
		configManager.getMilestone().aip11 = true;
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		assert.throws(
			() =>
				BuilderFactory.multiPayment()
					.fee("50000000")
					.addPayment("DBzGiUk8UVjB2dKCfGRixknB7Ki3Zhqthp", "1555")
					.addPayment("AJWRd23HNEhPLkK1ymMnwnDBX2a7QBZqff", "1555")
					.sign("dummy passphrase")
					.build(),
			(err) => err instanceof InvalidTransactionBytesError,
		);
	});

	it("deserialize - others - should throw if type is not supported", () => {
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const serializeWrongType = (transaction: ITransactionData) => {
			// copy-paste from transaction serializer, common stuff
			const buffer = new ByteBuffer(512, true);
			buffer.writeByte(0xff);
			buffer.writeByte(2);
			buffer.writeByte(transaction.network);
			buffer.writeUint32(Enums.TransactionTypeGroup.Core);
			buffer.writeUint16(transaction.type);
			buffer.writeUint64(transaction.nonce!.toFixed());
			buffer.append(transaction.senderPublicKey, "hex");
			buffer.writeUint64(Utils.BigNumber.make(transaction.fee).toFixed());
			buffer.writeByte(0x00);

			return Buffer.from(buffer.flip().toBuffer());
		};
		const transactionWrongType = BuilderFactory.transfer()
			.recipientId("APyFYXxXtUrvZFnEuwLopfst94GMY5Zkeq")
			.amount("10000")
			.fee("50000000")
			.vendorField("yo")
			.network(23)
			.sign("dummy passphrase")
			.getStruct();
		transactionWrongType.type = 55;

		const serialized = serializeWrongType(transactionWrongType).toString("hex");
		assert.throws(
			() => Deserializer.deserialize(serialized),
			(err) => err instanceof UnkownTransactionError,
		);
	});

	it("deserialize Schnorr / ECDSA - should deserialize a V2 transaction signed with Schnorr", () => {
		configManager.getMilestone().aip11 = true;

		const builder = builderWith(Hash.signSchnorr);

		let transaction: ITransaction;
		assert.equal(builder.data.version, 2);
		assert.not.throws(() => (transaction = builder.build()));
		assert.true(transaction!.verify());
	});

	it("deserialize Schnorr / ECDSA - should deserialize a V2 transaction signed with ECDSA", () => {
		configManager.getMilestone().aip11 = true;

		const builder = builderWith(Hash.signECDSA);

		let transaction: ITransaction;
		assert.equal(builder.data.version, 2);
		assert.not.equal(builder.data.signature.length, 64);
		assert.not.throws(() => (transaction = builder.build()));
		assert.true(transaction!.verify());
	});

	it("deserialize Schnorr / ECDSA - should throw when V2 transaction is signed with Schnorr and AIP11 not active", () => {
		configManager.getMilestone().aip11 = true;

		const builder = builderWith(Hash.signSchnorr);

		configManager.getMilestone().aip11 = false;
		assert.equal(builder.data.version, 2);
		assert.throws(() => builder.build());

		configManager.getMilestone().aip11 = true;
	});

	it("deserialize Schnorr / ECDSA - should throw when V1 transaction is signed with Schnorr", () => {
		configManager.getMilestone().aip11 = true;

		configManager.getMilestone().aip11 = false;

		const builder = builderWith(Hash.signSchnorr);
		const buffer = TransactionUtils.toHash(builder.data, {
			excludeSignature: true,
		});

		builder.data.signature = builder.data.signature = Hash.signSchnorr(buffer, Keys.fromPassphrase("secret"));

		assert.equal(builder.data.version, 1);
		assert.throws(() => builder.build());

		configManager.getMilestone().aip11 = true;
	});

	it("serialize - others - should throw if type is not supported", () => {
		const transactionWrongType = BuilderFactory.transfer()
			.recipientId("APyFYXxXtUrvZFnEuwLopfst94GMY5Zkeq")
			.amount("10000")
			.fee("50000000")
			.vendorField("yo")
			.network(23)
			.sign("dummy passphrase")
			.getStruct();
		transactionWrongType.type = 55;

		assert.throws(
			() => TransactionFactory.fromData(transactionWrongType),
			(err) => err instanceof UnkownTransactionError,
		);
	});

	it("getBytesV1 - should return Buffer of simply transaction and buffer must be 202 length", () => {
		configManager.getMilestone().aip11 = false;

		const transaction = {
			type: 0,
			amount: Utils.BigNumber.make(1000),
			fee: Utils.BigNumber.make(2000),
			recipientId: "AJWRd23HNEhPLkK1ymMnwnDBX2a7QBZqff",
			timestamp: 141738,
			asset: {},
			senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
			signature:
				"618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
			id: "13987348420913138422",
		};

		const bytes = Serializer.getBytes(transaction);
		assert.object(bytes);
		assert.equal(bytes.length, 202);
		assert.equal(
			bytes.toString("hex"),
			"00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09171dfc69b54c7fe901e91d5a9ab78388645e2427ea00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e803000000000000d007000000000000618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
		);

		configManager.getMilestone().aip11 = true;
	});

	it("getBytesV1 - should throw for unsupported version", () => {
		configManager.getMilestone().aip11 = false;

		const transaction = {
			version: 110,
			type: 0,
			amount: Utils.BigNumber.make(1000),
			fee: Utils.BigNumber.make(2000),
			recipientId: "AJWRd23HNEhPLkK1ymMnwnDBX2a7QBZqff",
			timestamp: 141738,
			asset: {},
			senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
			signature:
				"618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
			id: "13987348420913138422",
		};

		assert.throws(
			() => Serializer.getBytes(transaction),
			(err) => err instanceof TransactionVersionError,
		);

		configManager.getMilestone().aip11 = true;
	});
});
