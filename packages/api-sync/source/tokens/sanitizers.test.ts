import { describe } from "@mainsail/test-runner";
import { isValidPgTimestamptz, sanitizeComment } from "./sanitizers.js";

describe("Sanitizers", ({ assert, it }) => {
	it("isValidPgTimestamptz: accepts strict ISO timestamptz with ms + Z", () => {
		assert.true(isValidPgTimestamptz("2026-02-11T14:25:00.000Z"));
		assert.true(isValidPgTimestamptz("1970-01-01T00:00:00.000Z"));
	});

	it("isValidPgTimestamptz: rejects non-strings and wrong shapes", () => {
		assert.false(isValidPgTimestamptz(null));
		assert.false(isValidPgTimestamptz(undefined));
		assert.false(isValidPgTimestamptz(123));
		assert.false(isValidPgTimestamptz({}));

		// wrong timezone / missing ms / extra precision
		assert.false(isValidPgTimestamptz("2026-02-11T14:25:00Z"));
		assert.false(isValidPgTimestamptz("2026-02-11T14:25:00.000+09:00"));
		assert.false(isValidPgTimestamptz("2026-02-11T14:25:00.0000Z"));

		// not ISO
		assert.false(isValidPgTimestamptz("2026/02/11 14:25:00"));
		assert.false(isValidPgTimestamptz("not-a-date"));
	});

	it("isValidPgTimestamptz: rejects impossible dates (round-trip check)", () => {
		// Feb 30 is not real
		assert.false(isValidPgTimestamptz("2026-02-30T14:25:00.000Z"));

		// invalid time
		assert.false(isValidPgTimestamptz("2026-02-11T25:25:00.000Z"));
		assert.false(isValidPgTimestamptz("2026-02-11T14:60:00.000Z"));
		assert.false(isValidPgTimestamptz("2026-02-11T14:25:60.000Z"));
	});

	it("sanitizeComment: returns undefined for null/undefined/non-string/empty", () => {
		assert.equal(sanitizeComment(null), undefined);
		assert.equal(sanitizeComment(undefined), undefined);
		assert.equal(sanitizeComment(123), undefined);
		assert.equal(sanitizeComment({}), undefined);

		assert.equal(sanitizeComment(""), undefined);
		assert.equal(sanitizeComment("   "), undefined);
		assert.equal(sanitizeComment("\n\t  "), undefined);
	});

	it("sanitizeComment: trims and keeps content", () => {
		assert.equal(sanitizeComment(" hello "), "hello");
		assert.equal(sanitizeComment("hello"), "hello");
	});

	it("sanitizeComment: truncates to max length without breaking surrogate pairs", () => {
		const long = "a".repeat(300);
		const out = sanitizeComment(long);
		assert.defined(out);
		assert.equal(out.length, 256);
		assert.equal(out, "a".repeat(256));

		// surrogate pairs: 😀 is length 2 in JS, but 1 code point
		const emojis = "😀".repeat(400);
		const out2 = sanitizeComment(emojis);

		// should truncate by code points to 256 emojis
		assert.equal(Array.from(out2).length, 256);
		assert.equal(out2, "😀".repeat(256));
	});
});
