import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation";
import { describe, Sandbox } from "../../../test-framework";
import { headers as data } from "../../test/fixtures/responses/headers";
import { headers } from "./headers";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("Headers Schema", ({ it, assert, beforeEach, each }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.validator.addSchema(cryptoValidationSchemas.hex);
		context.validator.addSchema(cryptoBlockSchemas.blockId);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(headers, data);

		assert.undefined(result.error);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(headers, {
			height: 1,
			proposedBlockId: "a".repeat(64),
			round: 1,
			step: 1,
			validatorsSignedPrecommit: [true],
			validatorsSignedPrevote: [true],
			version: "2.0.0",
		});

		assert.undefined(result.error);
	});

	each(
		"height - should fail if not integer min 1",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				height: dataset,
			});

			assert.defined(result.error);
		},
		[0, -1, 1.1, "1", null, undefined],
	);

	each(
		"proposedBlockId - should pass if blockId or undefined",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				proposedBlockId: dataset,
			});

			assert.undefined(result.error);
		},
		["a".repeat(64), undefined],
	);

	each(
		"proposedBlockId - fail if not blockId or undefined",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				proposedBlockId: dataset,
			});

			assert.defined(result.error);
		},
		["a".repeat(63), "a".repeat(65), 1, null],
	);

	each(
		"round - should fail if not integer min 0",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				round: dataset,
			});

			assert.defined(result.error);
		},
		[-1, 1.1, "1", null, undefined],
	);

	each(
		"step - should fail if not integer min 0, max 2",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				step: dataset,
			});

			assert.defined(result.error);
		},
		[-1, 1.1, "1", 3, null, undefined],
	);

	each(
		"validatorsSignedPrecommit - should fail if not boolean array",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				validatorsSignedPrecommit: dataset,
			});

			assert.defined(result.error);
		},
		[0, null, undefined, [1], [null], [undefined]],
	);

	each(
		"validatorsSignedPrevote - should fail if not boolean array",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				validatorsSignedPrevote: dataset,
			});

			assert.defined(result.error);
		},
		[0, null, undefined, [1], [null], [undefined]],
	);

	each(
		"version - should pass if node version",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				version: dataset,
			});

			assert.undefined(result.error);
		},
		["1.1.1", "2.3.1"],
	);

	each(
		"version - should fail if not node version",
		({ context: { validator }, dataset }: { context: Context; dataset: any }) => {
			const result = validator.validate(headers, {
				...data,
				version: dataset,
			});

			assert.defined(result.error);
		},
		[0, null, undefined, "1", "1.1", "1.1.1.1"],
	);
});
