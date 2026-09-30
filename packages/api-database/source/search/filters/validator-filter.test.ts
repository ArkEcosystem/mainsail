import { describe } from "@mainsail/test-runner";

import { ValidatorFilter } from "./validator-filter";

const validatorGuard = [
	{ attribute: "validatorPublicKey", op: "jsonbAttributeExists", property: "attributes" },
	{
		jsonFieldAccessor: { fieldName: "validatorPublicKey", operator: "->>" },
		op: "notEqual",
		property: "attributes",
		value: "",
	},
];

describe("ValidatorFilter", ({ it, assert }) => {
	it("should always prepend the validator guard expressions for empty criteria", async () => {
		const expression = await ValidatorFilter.getExpression({});

		assert.equal(expression, { expressions: validatorGuard, op: "and" });
	});

	it("should ignore unknown keys (default -> true) but keep the guard", async () => {
		// @ts-ignore
		const expression = await ValidatorFilter.getExpression({ unknown: "value" });

		assert.equal(expression, { expressions: validatorGuard, op: "and" });
	});

	it("should build an equal expression for address", async () => {
		const expression = await ValidatorFilter.getExpression({ address: "addr" });

		assert.equal(expression, {
			expressions: [...validatorGuard, { op: "equal", property: "address", value: "addr" }],
			op: "and",
		});
	});

	it("should build an equal expression for publicKey", async () => {
		const expression = await ValidatorFilter.getExpression({ publicKey: "pk" });

		assert.equal(expression, {
			expressions: [...validatorGuard, { op: "equal", property: "publicKey", value: "pk" }],
			op: "and",
		});
	});

	it("should build a jsonFieldAccessor equal expression for isResigned", async () => {
		const expression = await ValidatorFilter.getExpression({ isResigned: true });

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					jsonFieldAccessor: { fieldName: "validatorResigned", operator: "->>" },
					op: "equal",
					property: "attributes",
					value: true,
				},
			],
			op: "and",
		});
	});

	it("should build a jsonFieldAccessor comparison for scalar votes", async () => {
		const expression = await ValidatorFilter.getExpression({ votes: "100" });

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					jsonFieldAccessor: { fieldName: "validatorVoteBalance", operator: "->>" },
					op: "equal",
					property: "attributes",
					value: "100",
				},
			],
			op: "and",
		});
	});

	it("should build a between comparison for rank from & to", async () => {
		const expression = await ValidatorFilter.getExpression({ rank: { from: 1, to: 10 } });

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					from: 1,
					jsonFieldAccessor: { fieldName: "validatorRank", operator: "->>" },
					op: "between",
					property: "attributes",
					to: 10,
				},
			],
			op: "and",
		});
	});

	it("should OR array votes values", async () => {
		const expression = await ValidatorFilter.getExpression({ votes: ["1", "2"] });

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					expressions: [
						{
							jsonFieldAccessor: { fieldName: "validatorVoteBalance", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: "1",
						},
						{
							jsonFieldAccessor: { fieldName: "validatorVoteBalance", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: "2",
						},
					],
					op: "or",
				},
			],
			op: "and",
		});
	});

	it("should build forged fees/rewards/total comparisons under an or", async () => {
		const expression = await ValidatorFilter.getExpression({
			forged: [{ fees: "10", rewards: "20", total: "30" }],
		});

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					expressions: [
						{
							jsonFieldAccessor: { fieldName: "validatorForgedFees", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: "10",
						},
						{
							jsonFieldAccessor: { fieldName: "validatorForgedRewards", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: "20",
						},
						{
							jsonFieldAccessor: { fieldName: "validatorForgedTotal", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: "30",
						},
					],
					op: "or",
				},
			],
			op: "and",
		});
	});

	it("should build production approval comparison", async () => {
		const expression = await ValidatorFilter.getExpression({ production: [{ approval: "5" }] });

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					jsonFieldAccessor: { fieldName: "validatorApproval", operator: "->>" },
					op: "equal",
					property: "attributes",
					value: "5",
				},
			],
			op: "and",
		});
	});

	it("should build blocks produced and last-block comparisons", async () => {
		const expression = await ValidatorFilter.getExpression({
			blocks: [{ last: [{ hash: "h", number: 7 }], produced: 3 }],
		});

		assert.equal(expression, {
			expressions: [
				...validatorGuard,
				{
					expressions: [
						{
							jsonFieldAccessor: { fieldName: "validatorProducedBlocks", operator: "->>" },
							op: "equal",
							property: "attributes",
							value: 3,
						},
						{
							jsonFieldAccessor: {
								cast: undefined,
								fieldName: "validatorLastBlock.hash",
								operator: "->>",
							},
							op: "equal",
							property: "attributes",
							value: "h",
						},
						{
							jsonFieldAccessor: {
								cast: "bigint",
								fieldName: "validatorLastBlock.number",
								operator: "->>",
							},
							op: "equal",
							property: "attributes",
							value: 7,
						},
					],
					op: "or",
				},
			],
			op: "and",
		});
	});
});
