import "jest-extended";

import { Factories, Generators } from "@packages/core-test-framework";
import { Utils } from "@packages/crypto";
import { TransactionType } from "@packages/crypto/source/enums";
import { Keys, WIF } from "@packages/crypto/source/identities";
import { configManager } from "@packages/crypto/source/managers";
import { devnet } from "@packages/crypto/source/networks";
import { BuilderFactory } from "@packages/crypto/source/transactions";
import { TransferBuilder } from "@packages/crypto/source/transactions/builders/transactions/transfer";
import { Two } from "@packages/crypto/source/transactions/types";

let builder: TransferBuilder;
let identity;

beforeAll(() => {
	// todo: completely wrap this into a function to hide the generation and setting of the config?
	const config = Generators.generateCryptoConfigRaw();
	configManager.setConfig(config);

	identity = Factories.factory("Identity")
		.withOptions({ passphrase: "this is a top secret passphrase", network: config.network })
		.make();
});

beforeEach(() => (builder = BuilderFactory.transfer()));

describe("Transfer Transaction", () => {
	describe("verify", () => {
		it("should be valid with a signature", () => {
			const actual = builder
				.recipientId(identity.address)
				.amount("1")
				.vendorField("dummy")
				.sign("dummy passphrase");

			expect(actual.build().verified).toBeTrue();
			expect(actual.verify()).toBeTrue();
		});

		it("should be valid with a second signature", () => {
			const actual = builder
				.recipientId(identity.address)
				.amount("1")
				.vendorField("dummy")
				.sign("dummy passphrase");

			expect(actual.build().verified).toBeTrue();
			expect(actual.verify()).toBeTrue();
		});
	});

	describe("signWithWif", () => {
		it("should sign a transaction and match signed with a passphrase", () => {
			const passphrase = "sample passphrase";
			const network = 23;
			const keys = Keys.fromPassphrase(passphrase);
			const wif = WIF.fromKeys(keys, devnet.network);

			const wifTransaction = builder.recipientId(identity.address).amount("10").fee("10").network(network);

			const passphraseTransaction = BuilderFactory.transfer();
			passphraseTransaction.data = { ...wifTransaction.data };

			wifTransaction.signWithWif(wif, 170);
			passphraseTransaction.sign(passphrase);

			expect(wifTransaction.data.signature).toBe(passphraseTransaction.data.signature);
		});
	});

	it("should have its specific properties", () => {
		expect(builder).toHaveProperty("data.type", TransactionType.Transfer);
		expect(builder).toHaveProperty("data.fee", Two.TransferTransaction.staticFee());
		expect(builder).toHaveProperty("data.amount", Utils.BigNumber.make(0));
		expect(builder).toHaveProperty("data.recipientId", undefined);
		expect(builder).toHaveProperty("data.senderPublicKey", undefined);
		expect(builder).toHaveProperty("data.expiration", 0);
	});

	describe("vendorField", () => {
		it("should set the vendorField", () => {
			builder.vendorField("fake");
			expect(builder.data.vendorField).toBe("fake");
		});
	});
});
