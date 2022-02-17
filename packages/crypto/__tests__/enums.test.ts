import "jest-extended";

import { TransactionType } from "@packages/crypto/source/enums";

describe("Constants", () => {
	it("transaction types are defined", () => {
		expect(TransactionType).toBeDefined();

		expect(TransactionType.Transfer).toBeDefined();
		expect(TransactionType.Transfer).toBe(0);

		expect(TransactionType.DelegateRegistration).toBeDefined();
		expect(TransactionType.DelegateRegistration).toBe(2);

		expect(TransactionType.Vote).toBeDefined();
		expect(TransactionType.Vote).toBe(3);

		expect(TransactionType.MultiSignature).toBeDefined();
		expect(TransactionType.MultiSignature).toBe(4);

		expect(TransactionType.MultiPayment).toBeDefined();
		expect(TransactionType.MultiPayment).toBe(6);

		expect(TransactionType.DelegateResignation).toBeDefined();
		expect(TransactionType.DelegateResignation).toBe(7);
	});
});
