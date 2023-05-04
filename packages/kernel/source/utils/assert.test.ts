import { describe } from "../../../core-test-framework";
import { assert as assertToTest } from "./assert";

describe("Assertions", ({ assert, it }) => {
	it(".array", (context) => {
		assert.throws(() => assertToTest.array("abc"), 'Expected value which is "array".');
		assert.undefined(assertToTest.array([]));
	});

	it(".bigint", (context) => {
		assert.throws(() => assertToTest.bigint("abc"), 'Expected value which is "bigint".');
		assert.throws(() => assertToTest.bigint(1), 'Expected value which is "bigint".');
		assert.undefined(assertToTest.bigint(BigInt(1)));
	});

	it(".boolean", (context) => {
		assert.throws(() => assertToTest.boolean("abc"), 'Expected value which is "boolean".');
		assert.undefined(assertToTest.boolean(true));
		assert.undefined(assertToTest.boolean(false));
	});

	it(".buffer", (context) => {
		assert.throws(() => assertToTest.buffer("abc"), 'Expected value which is "buffer".');
		assert.undefined(assertToTest.buffer(Buffer.alloc(8)));
	});

	it(".defined", (context) => {
		assert.throws(() => assertToTest.defined(), 'Expected value which is "non-null and non-undefined".');
		assert.throws(() => assertToTest.defined(null), 'Expected value which is "non-null and non-undefined".');
		assert.undefined(assertToTest.defined("abc"));
	});

	it(".number", (context) => {
		assert.throws(() => assertToTest.number("abc"), 'Expected value which is "number".');
		assert.undefined(assertToTest.number(1));
	});

	it(".object", (context) => {
		assert.throws(() => assertToTest.object("abc"), 'Expected value which is "object".');
		assert.undefined(assertToTest.object({}));
	});

	it(".string", (context) => {
		assert.throws(() => assertToTest.string(1), 'Expected value which is "string".');
		assert.undefined(assertToTest.string("abc"));
	});

	it(".symbol", (context) => {
		assert.throws(() => assertToTest.symbol("abc"), 'Expected value which is "symbol".');
		assert.undefined(assertToTest.symbol(Symbol(1)));
	});

	it(".undefined", () => {
		assert.throws(() => assertToTest.undefined("abc"), 'Expected value which is "undefined".');
		assert.undefined(assertToTest.undefined());
	});
});
