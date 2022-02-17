import "jest-extended";

import { BuilderFactory } from "../../../../../packages/crypto/source/transactions";
import { DelegateRegistrationBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/delegate-registration";
import { DelegateResignationBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/delegate-resignation";
import { MultiPaymentBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/multi-payment";
import { MultiSignatureBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/multi-signature";
import { TransferBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/transfer";
import { VoteBuilder } from "../../../../../packages/crypto/source/transactions/builders/transactions/vote";

describe("Builder Factory", () => {
	it("should create DelegateRegistrationBuilder", () => {
		expect(BuilderFactory.delegateRegistration()).toBeInstanceOf(DelegateRegistrationBuilder);
	});

	it("should create DelegateResignationBuilder", () => {
		expect(BuilderFactory.delegateResignation()).toBeInstanceOf(DelegateResignationBuilder);
	});

	it("should create MultiPaymentBuilder", () => {
		expect(BuilderFactory.multiPayment()).toBeInstanceOf(MultiPaymentBuilder);
	});

	it("should create MultiSignatureBuilder", () => {
		expect(BuilderFactory.multiSignature()).toBeInstanceOf(MultiSignatureBuilder);
	});

	it("should create TransferBuilder", () => {
		expect(BuilderFactory.transfer()).toBeInstanceOf(TransferBuilder);
	});

	it("should create VoteBuilder", () => {
		expect(BuilderFactory.vote()).toBeInstanceOf(VoteBuilder);
	});
});
