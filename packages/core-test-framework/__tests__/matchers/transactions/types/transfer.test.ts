import "@packages/core-test-framework/source/matchers/transactions/types/transfer";
import { Factories, FactoryBuilder } from "@packages/core-test-framework/source/factories";
import { Interfaces } from "@packages/crypto";

let factory: FactoryBuilder;

beforeEach(() => {
	factory = new FactoryBuilder();

	Factories.registerTransactionFactory(factory);
});

describe("Transfer", () => {
	describe("toBeTransferType", () => {
		it("should be transfer type", async () => {
			const transaction: Interfaces.ITransaction = factory.get("Transfer").make();

			expect(transaction.data).toBeTransferType();
		});

		it("should not be transfer type", async () => {
			const transaction: Interfaces.ITransaction = factory.get("Vote").make();

			expect(transaction.data).not.toBeTransferType();
		});
	});
});
