import { describe, Generators } from "@arkecosystem/core-test-framework/source";
import { TransactionFactory } from "@arkecosystem/core-test-framework/source/utils/transaction-factory";
import { Address, Keys } from "../identities";
import { Hash } from "../crypto/hash";
import { BuilderFactory } from "./builders/index";
import { Verifier } from "./verifier";
import { Utils } from "./utils";
import { configManager } from "../../../../packages/crypto/source/managers";
import { createRandomTx } from "../../test/support";
import { ITransactionData, NetworkConfig } from "../interfaces";

describe<{
	config: NetworkConfig;
	transaction: ITransactionData;
	otherPublicKey: string;
}>("Verifier", ({ it, assert, beforeAll, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		context.transaction = TransactionFactory.initialize()
			.transfer("AJWRd23HNEhPLkK1ymMnwnDBX2a7QBZqff", 1000)
			.withVersion(2)
			.withFee(2000)
			.withPassphrase("secret")
			.createOne();

		context.otherPublicKey = "0203bc6522161803a4cd9d8c7b7e3eb5b29f92106263a3979e3e02d27a70e830b4";
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("should return true on a valid signature", (context) => {
		assert.true(Verifier.verifyHash(context.transaction));
	});

	it("should return false on an invalid signature", (context) => {
		assert.false(
			Verifier.verifyHash(Object.assign({}, context.transaction, { senderPublicKey: context.otherPublicKey })),
		);
	});

	it("should return false on a missing signature", (context) => {
		const transactionWithoutSignature = Object.assign({}, context.transaction);
		delete transactionWithoutSignature.signature;

		assert.false(Verifier.verifyHash(transactionWithoutSignature));
	});

	it("should verify ECDSA signature for a version 2 transaction", (context) => {
		const keys = Keys.fromPassphrase("secret");
		const { data }: any = BuilderFactory.transfer()
			.senderPublicKey(keys.publicKey)
			.recipientId(Address.fromPublicKey(keys.publicKey))
			.version(2)
			.fee("10")
			.amount("100");

		const hash = Utils.toHash(data);
		data.signature = Hash.signECDSA(hash, keys);

		assert.true(Verifier.verify(data));
	});

	for (const type of [0, 2, 3]) {
		it(`type ${type} - should be ok`, () => {
			const tx = createRandomTx(type);

			assert.true(tx.verify());
		});
	}

	it("type 4 - should return false if AIP11 is not activated", () => {
		const tx = createRandomTx(4);
		configManager.getMilestone().aip11 = false;
		assert.false(tx.verify());
	});

	it("type 4 - should return true if AIP11 is activated", () => {
		const tx = createRandomTx(4);
		configManager.getMilestone().aip11 = true;
		assert.true(tx.verify());
		configManager.getMilestone().aip11 = false;
	});
});
