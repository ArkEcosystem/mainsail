import "jest-extended";

import { Generators } from "@packages/core-test-framework/source";
import { TransactionType } from "@packages/crypto/source/enums";
import { configManager } from "@packages/crypto/source/managers";
import { BuilderFactory } from "@packages/crypto/source/transactions/builders";
import { DelegateResignationBuilder } from "@packages/crypto/source/transactions/builders/transactions/delegate-resignation";
import { Two } from "@packages/crypto/source/transactions/types";
import { BigNumber } from "@packages/crypto/source/utils";

let builder: DelegateResignationBuilder;

beforeEach(() => {
	// todo: completely wrap this into a function to hide the generation and setting of the config?
	const config = Generators.generateCryptoConfigRaw();
	configManager.setConfig(config);

	builder = BuilderFactory.delegateResignation();
});

describe("Delegate Resignation Transaction", () => {
	describe("verify", () => {
		it("should be valid with a signature", () => {
			const actual = builder.sign("dummy passphrase");

			expect(actual.build().verified).toBeTrue();
			expect(actual.verify()).toBeTrue();
		});

		it("should be valid with a second signature", () => {
			const actual = builder.sign("dummy passphrase");

			expect(actual.build().verified).toBeTrue();
			expect(actual.verify()).toBeTrue();
		});
	});

	describe("properties", () => {
		it("should have its specific properties", () => {
			expect(builder).toHaveProperty("data.type", TransactionType.DelegateResignation);
			expect(builder).toHaveProperty("data.amount", BigNumber.ZERO);
			expect(builder).toHaveProperty("data.fee", Two.DelegateResignationTransaction.staticFee());
			expect(builder).toHaveProperty("data.senderPublicKey", undefined);
		});

		it("should not have the username yet", () => {
			expect(builder).not.toHaveProperty("data.username");
		});
	});
});
