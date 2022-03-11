import { describe } from "@arkecosystem/core-test-framework";
import { BuilderFactory } from "./index";
import { DelegateRegistrationBuilder } from "./transactions/delegate-registration";
import { DelegateResignationBuilder } from "./transactions/delegate-resignation";
import { MultiPaymentBuilder } from "./transactions/multi-payment";
import { MultiSignatureBuilder } from "./transactions/multi-signature";
import { TransferBuilder } from "./transactions/transfer";
import { VoteBuilder } from "./transactions/vote";

describe("Builder Factory", ({ it, assert }) => {
	it("should create DelegateRegistrationBuilder", () => {
		assert.instance(BuilderFactory.delegateRegistration(), DelegateRegistrationBuilder);
	});

	it("should create DelegateResignationBuilder", () => {
		assert.instance(BuilderFactory.delegateResignation(), DelegateResignationBuilder);
	});

	it("should create MultiPaymentBuilder", () => {
		assert.instance(BuilderFactory.multiPayment(), MultiPaymentBuilder);
	});

	it("should create MultiSignatureBuilder", () => {
		assert.instance(BuilderFactory.multiSignature(), MultiSignatureBuilder);
	});

	it("should create TransferBuilder", () => {
		assert.instance(BuilderFactory.transfer(), TransferBuilder);
	});

	it("should create VoteBuilder", () => {
		assert.instance(BuilderFactory.vote(), VoteBuilder);
	});
});
