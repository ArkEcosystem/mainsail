import { describe } from "@mainsail/test-runner";

import { TransactionFilter } from "./transaction-filter";

describe("TransactionFilter.getExpression", ({ it, assert }) => {
	// walletRepository is only threaded through address handling and never has a method
	// invoked on it, so a bare object suffices.
	const walletRepository: any = {};

	it("should build an equal expression for a single hash criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { hash: "abc" });

		assert.equal(expression, { op: "equal", property: "hash", value: "abc" });
	});

	it("should build an equal expression for a single blockHash criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { blockHash: "deadbeef" });

		assert.equal(expression, { op: "equal", property: "blockHash", value: "deadbeef" });
	});

	it("should build an equal expression for a senderPublicKey criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { senderPublicKey: "02aa" });

		assert.equal(expression, { op: "equal", property: "senderPublicKey", value: "02aa" });
	});

	it("should build an equal expression on 'from' for a from criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { from: "AXsender" });

		assert.equal(expression, { op: "equal", property: "from", value: "AXsender" });
	});

	it("should build an or expression on 'to' plus multiPayment for a to criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { to: "AXrecipient" });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "to", value: "AXrecipient" },
				{ op: "multiPayment", value: ["AXrecipient"] },
			],
			op: "or",
		});
	});

	it("should build a sender-or-recipient (incl. multiPayment) expression for an address criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { address: "AXboth" });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "from", value: "AXboth" },
				{ op: "equal", property: "to", value: "AXboth" },
				{ op: "multiPayment", value: ["AXboth"] },
			],
			op: "or",
		});
	});

	it("should build a between expression for a numeric from/to value criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { value: { from: "1", to: "10" } });

		assert.equal(expression, {
			from: "1",
			jsonFieldAccessor: undefined,
			op: "between",
			property: "value",
			to: "10",
		});
	});

	it("should build a greaterThanEqual expression for a numeric from-only nonce criterion", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { nonce: { from: "2" } });

		assert.equal(expression, {
			jsonFieldAccessor: undefined,
			op: "greaterThanEqual",
			property: "nonce",
			value: "2",
		});
	});

	it("should map each numeric field to a scalar equal expression", async () => {
		for (const property of ["transactionIndex", "timestamp", "nonce", "value", "gasPrice"] as const) {
			const expression = await TransactionFilter.getExpression(walletRepository, { [property]: 7 } as any);

			assert.equal(expression, { jsonFieldAccessor: undefined, op: "equal", property, value: 7 });
		}
	});

	it("should build an or expression for an or-array of hash criteria", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, [{ hash: "a" }, { hash: "b" }]);

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "hash", value: "a" },
				{ op: "equal", property: "hash", value: "b" },
			],
			op: "or",
		});
	});

	it("should transform data criterion into a functionSig with a \\x-prefixed hex value", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { data: "0xdeadbeef" });

		assert.equal(expression, { op: "functionSig", property: "data", value: "\\xdeadbeef" });
	});

	it("should prefix \\x for data without a 0x prefix", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { data: "cafe" });

		assert.equal(expression, { op: "functionSig", property: "data", value: "\\xcafe" });
	});

	it("should map deployedContractAddress:true to a notNull expression", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, { deployedContractAddress: true });

		assert.equal(expression, { op: "notNull", property: "deployedContractAddress" });
	});

	it("should map deployedContractAddress:false to a false expression, collapsing the and to true", async () => {
		// The false expression is nested under handleTransactionCriteria's inner { op:"and" },
		// and optimizeExpression collapses an `and` whose only child is `false` to `false`,
		// but the outer wrapping produces `false` overall.
		const expression = await TransactionFilter.getExpression(walletRepository, { deployedContractAddress: false });

		assert.equal(expression, { op: "false" });
	});

	it("derives deployedContractAddress cardinality from itself, not from gasPrice", async () => {
		// Regression: the case previously iterated criteria.gasPrice, so pairing it with an array
		// gasPrice duplicated the notNull expression once per gasPrice value. It must produce a
		// single notNull regardless of how many gasPrice values are supplied.
		const expression = await TransactionFilter.getExpression(walletRepository, {
			deployedContractAddress: true,
			gasPrice: [5, 6],
		});

		assert.equal(expression, {
			expressions: [
				{ op: "notNull", property: "deployedContractAddress" },
				{
					expressions: [
						{ jsonFieldAccessor: undefined, op: "equal", property: "gasPrice", value: 5 },
						{ jsonFieldAccessor: undefined, op: "equal", property: "gasPrice", value: 6 },
					],
					op: "or",
				},
			],
			op: "and",
		});
	});

	it("should build an and expression combining multiple fields", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, {
			blockHash: "bh",
			hash: "h",
		});

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "blockHash", value: "bh" },
				{ op: "equal", property: "hash", value: "h" },
			],
			op: "and",
		});
	});

	it("should collapse an empty criterion to true", async () => {
		const expression = await TransactionFilter.getExpression(walletRepository, {});

		assert.equal(expression, { op: "true" });
	});

	it("should collapse an unknown key to true", async () => {
		// @ts-ignore - exercising the default branch with an unknown key
		const expression = await TransactionFilter.getExpression(walletRepository, { unknownKey: "v" });

		assert.equal(expression, { op: "true" });
	});
});
