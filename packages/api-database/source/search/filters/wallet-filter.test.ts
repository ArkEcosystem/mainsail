import { describe } from "@mainsail/test-runner";

import { WalletFilter } from "./wallet-filter";

describe("WalletFilter.getExpression", ({ it, assert }) => {
	it("should build an equal expression for a single address criterion", async () => {
		const expression = await WalletFilter.getExpression({ address: "AXZxhtnUUZ" });

		assert.equal(expression, { op: "equal", property: "address", value: "AXZxhtnUUZ" });
	});

	it("should build an equal expression for a single publicKey criterion", async () => {
		const expression = await WalletFilter.getExpression({ publicKey: "02deadbeef" });

		assert.equal(expression, { op: "equal", property: "publicKey", value: "02deadbeef" });
	});

	it("should build a between expression for a numeric from/to balance criterion", async () => {
		const expression = await WalletFilter.getExpression({ balance: { from: "1", to: "10" } });

		assert.equal(expression, {
			from: "1",
			jsonFieldAccessor: undefined,
			op: "between",
			property: "balance",
			to: "10",
		});
	});

	it("should build a greaterThanEqual expression when only from is provided", async () => {
		const expression = await WalletFilter.getExpression({ nonce: { from: "5" } });

		assert.equal(expression, {
			jsonFieldAccessor: undefined,
			op: "greaterThanEqual",
			property: "nonce",
			value: "5",
		});
	});

	it("should build a lessThanEqual expression when only to is provided", async () => {
		const expression = await WalletFilter.getExpression({ nonce: { to: "9" } });

		assert.equal(expression, {
			jsonFieldAccessor: undefined,
			op: "lessThanEqual",
			property: "nonce",
			value: "9",
		});
	});

	it("should build an or expression for an or-array of address criteria", async () => {
		const expression = await WalletFilter.getExpression([{ address: "A" }, { address: "B" }]);

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "address", value: "A" },
				{ op: "equal", property: "address", value: "B" },
			],
			op: "or",
		});
	});

	it("should build an and expression combining multiple fields", async () => {
		const expression = await WalletFilter.getExpression({ address: "A", publicKey: "02" });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "address", value: "A" },
				{ op: "equal", property: "publicKey", value: "02" },
			],
			op: "and",
		});
	});

	it("should collapse an unknown/empty criterion to true", async () => {
		const expression = await WalletFilter.getExpression({});

		assert.equal(expression, { op: "true" });
	});

	it("should collapse an unknown key to true", async () => {
		// @ts-ignore - exercising the default branch with an unknown key
		const expression = await WalletFilter.getExpression({ unknownKey: "value" });

		assert.equal(expression, { op: "true" });
	});

	it("should build a jsonb attribute expression with inferred bigint cast for nonce attribute", async () => {
		const expression = await WalletFilter.getExpression({ attributes: { nonce: "3" } });

		assert.equal(expression, {
			jsonFieldAccessor: { cast: "bigint", fieldName: "nonce", operator: "->>" },
			op: "equal",
			property: "attributes",
			value: "3",
		});
	});

	it("should build a jsonb attribute expression with numeric cast for balance attribute", async () => {
		const expression = await WalletFilter.getExpression({ attributes: { balance: "100" } });

		assert.equal(expression, {
			jsonFieldAccessor: { cast: "numeric", fieldName: "balance", operator: "->>" },
			op: "equal",
			property: "attributes",
			value: "100",
		});
	});

	it("should flatten a single-key nested attribute into a dotted path with inferred cast", async () => {
		const expression = await WalletFilter.getExpression({
			attributes: { validatorLastBlock: { number: "42" } },
		});

		assert.equal(expression, {
			jsonFieldAccessor: { cast: "bigint", fieldName: "validatorLastBlock.number", operator: "->>" },
			op: "equal",
			property: "attributes",
			value: "42",
		});
	});

	it("should leave unknown attribute cast type undefined", async () => {
		const expression = await WalletFilter.getExpression({ attributes: { username: "alice" } });

		assert.equal(expression, {
			jsonFieldAccessor: { cast: undefined, fieldName: "username", operator: "->>" },
			op: "equal",
			property: "attributes",
			value: "alice",
		});
	});

	it("should reject an attribute key with SQL-injection characters", async () => {
		await assert.rejects(
			() => WalletFilter.getExpression({ attributes: { "a'||pg_sleep(5)||'b": "1" } }),
			"Invalid attribute key 'a'||pg_sleep(5)||'b'",
		);
	});

	it("should reject a nested attribute key with SQL-injection characters", async () => {
		// The injection is in the nested key, which is only visible after flattening to a dotted path.
		await assert.rejects(
			() => WalletFilter.getExpression({ attributes: { validatorLastBlock: { "number')::bigint--": "1" } } }),
			"Invalid attribute key 'validatorLastBlock.number')::bigint--'",
		);
	});

	it("should reject attribute keys containing injection metacharacters", async () => {
		const maliciousKeys = [
			"x'; DROP TABLE wallets; --", // stacked statement
			"x') UNION SELECT secret FROM users --", // union
			"x\\'", // backslash + quote (standard_conforming_strings=off breakout)
			"a b", // whitespace
			'a"b', // double quote
			"a;b", // semicolon
			"a(b)", // parentheses
			".leadingDot", // structural: leading dot
			"trailingDot.", // structural: trailing dot
			"double..dot", // structural: empty segment
		];

		for (const key of maliciousKeys) {
			await assert.rejects(
				() => WalletFilter.getExpression({ attributes: { [key]: "1" } }),
				`Invalid attribute key '${key}'`,
			);
		}
	});

	it("should accept a safe custom attribute key outside the known list", async () => {
		// The allowlist permits letters/digits/underscore dotted paths, not only the known attributes,
		// so an unknown-but-safe key still builds a query (with undefined cast).
		const expression = await WalletFilter.getExpression({ attributes: { my_custom_attr0: "1" } });

		assert.equal(expression, {
			jsonFieldAccessor: { cast: undefined, fieldName: "my_custom_attr0", operator: "->>" },
			op: "equal",
			property: "attributes",
			value: "1",
		});
	});
});
