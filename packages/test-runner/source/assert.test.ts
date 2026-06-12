import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Assertion } from "uvu/assert";

import { describe } from "./describe";

// uvu's `throws` (and our `rejects`) re-throw Assertion errors instead of matching
// them, so failing assertion paths are verified with these local helpers.
const expectFail = (callback: () => void, messageIncludes?: string): void => {
	let caught: Error | undefined;

	try {
		callback();
	} catch (error) {
		caught = error as Error;
	}

	if (caught === undefined) {
		throw new Error("Expected the assertion to fail but it passed.");
	}

	if (messageIncludes !== undefined && !String(caught.message).includes(messageIncludes)) {
		throw new Error(`Expected the failure message to include "${messageIncludes}" but got: ${caught.message}`);
	}
};

const expectFailAsync = async (callback: () => Promise<void>, messageIncludes?: string): Promise<void> => {
	let caught: Error | undefined;

	try {
		await callback();
	} catch (error) {
		caught = error as Error;
	}

	if (caught === undefined) {
		throw new Error("Expected the assertion to fail but it passed.");
	}

	if (messageIncludes !== undefined && !String(caught.message).includes(messageIncludes)) {
		throw new Error(`Expected the failure message to include "${messageIncludes}" but got: ${caught.message}`);
	}
};

describe("assert (types)", ({ assert, it }) => {
	it("array - should pass for arrays and fail for everything else", () => {
		assert.array([]);
		assert.array([1, 2, 3]);

		expectFail(() => assert.array("nope"), "Expected value to be an array");
		expectFail(() => assert.array({ length: 0 }), "Expected value to be an array");
	});

	it("boolean - should pass for booleans and fail for everything else", () => {
		assert.boolean(true);
		assert.boolean(false);

		expectFail(() => assert.boolean("true"));
		expectFail(() => assert.boolean(1));
	});

	it("buffer - should pass for buffers and fail for everything else", () => {
		assert.buffer(Buffer.from("hello"));

		expectFail(() => assert.buffer("hello"));
	});

	it("bufferArray - should pass when every value is a buffer", () => {
		assert.bufferArray([Buffer.from("a"), Buffer.from("b")]);
		assert.bufferArray([]); // vacuously true

		expectFail(() => assert.bufferArray([Buffer.from("a"), "b"]), "Expected every value to be a buffer.");
	});

	it("function - should pass for functions and fail for everything else", () => {
		assert.function(() => {});

		expectFail(() => assert.function("nope"));
	});

	it("null - should pass for null and fail for everything else", () => {
		assert.null(null);

		expectFail(() => assert.null(undefined), "Expected value to be null");
		expectFail(() => assert.null(0), "Expected value to be null");
	});

	it("number - should pass for numbers and fail for everything else", () => {
		assert.number(1);
		assert.number(Number.NaN);

		expectFail(() => assert.number("1"));
	});

	it("object - should pass for objects and fail for everything else", () => {
		assert.object({});
		assert.object(null); // typeof null === "object"

		expectFail(() => assert.object("nope"));
	});

	it("string - should pass for strings and fail for everything else", () => {
		assert.string("hello");

		expectFail(() => assert.string(1));
	});

	it("stringArray - should pass when every value is a string", () => {
		assert.stringArray(["a", "b"]);
		assert.stringArray([]); // vacuously true

		expectFail(() => assert.stringArray(["a", 1]), "Expected every value to be a string.");
	});

	it("instance - should pass for matching constructors", () => {
		assert.instance(new Date(), Date);

		expectFail(() => assert.instance({}, Date));
	});

	it("type - should pass for matching typeof results", () => {
		assert.type(1, "number");
		assert.type("a", "string");

		expectFail(() => assert.type(1, "string"));
	});
});

describe("assert (truthiness)", ({ assert, it }) => {
	it("true/false - should require strict booleans", () => {
		assert.true(true);
		assert.false(false);

		expectFail(() => assert.true(1));
		expectFail(() => assert.false(0));
	});

	it("truthy - should pass for truthy values", () => {
		assert.truthy(1);
		assert.truthy("a");
		assert.truthy({});

		expectFail(() => assert.truthy(0), "Expected value to be truthy");
		expectFail(() => assert.truthy(""), "Expected value to be truthy");
	});

	it("ok - should pass for truthy values", () => {
		assert.ok(1);

		expectFail(() => assert.ok(0));
	});

	it("defined/undefined - should distinguish undefined from everything else", () => {
		assert.defined({});
		assert.defined(null);
		assert.undefined(undefined);

		expectFail(() => assert.defined(undefined), "Expected value to be defined.");
		expectFail(() => assert.undefined({}), "Expected value to be undefined.");

		// Not...
		assert.not.defined(undefined);
		assert.not.undefined({});

		expectFail(() => assert.not.defined({}), "Expected value not to be defined.");
		expectFail(() => assert.not.undefined(undefined), "Expected value not to be undefined.");
	});

	it("unreachable - should always fail", () => {
		expectFail(() => assert.unreachable());
	});
});

describe("assert (comparisons)", ({ assert, it }) => {
	it("equal - should deeply compare primitives, plain objects and arrays", () => {
		assert.equal("hello", "hello");
		assert.equal(5, 5);
		assert.equal(25n, 25n);
		assert.equal({ a: [{ b: 1 }] }, { a: [{ b: 1 }] });
		assert.equal([1, [2, 3]], [1, [2, 3]]);

		// Not...
		assert.not.equal("hello", "world");
		assert.not.equal(10n, 15n);
		assert.not.equal({ a: [{ b: 1 }] }, { a: [{ b: 2 }] });

		expectFail(() => assert.equal({ a: 1 }, { a: 2 }));
		expectFail(() => assert.not.equal({ a: 1 }, { a: 1 }));
	});

	it("equal - should compare class instances as-is", () => {
		assert.equal(Buffer.from("abc"), Buffer.from("abc"));
		assert.not.equal(Buffer.from("abc"), Buffer.from("abd"));
		assert.equal(new Map([["a", 1]]), new Map([["a", 1]]));
		assert.equal(new Date(0), new Date(0));
	});

	it("is - should compare by strict equality", () => {
		assert.is(1, 1);

		const reference = {};
		assert.is(reference, reference);

		expectFail(() => assert.is({}, {})); // not the same reference
	});

	it("gt/gte/lt/lte - should compare numbers", () => {
		assert.gt(2, 1);
		assert.gte(2, 2);
		assert.lt(1, 2);
		assert.lte(2, 2);

		expectFail(() => assert.gt(1, 1), "Expected 1 to be greater than 1.");
		expectFail(() => assert.gte(1, 2), "Expected 1 to be greater than or equal to 2.");
		expectFail(() => assert.lt(1, 1), "Expected 1 to be less than 1.");
		expectFail(() => assert.lte(2, 1), "Expected 2 to be less than or equal to 1.");
	});

	it("positive - should require a number greater than zero", () => {
		assert.positive(1);

		expectFail(() => assert.positive(0), "Expected 0 to be positive.");
		expectFail(() => assert.positive(-1), "Expected -1 to be positive.");
	});

	it("length - should compare string and array lengths", () => {
		assert.length("abc", 3);
		assert.length([1, 2], 2);

		expectFail(() => assert.length("abc", 2));
	});

	it("startsWith - should check string prefixes", () => {
		assert.startsWith("hello world", "hello");

		expectFail(() => assert.startsWith("hello world", "world"), 'Expected "hello world" to start with "world".');
	});

	it("match - should match substrings and patterns", () => {
		assert.match("hello world", "world");
		assert.match("hello world", /^hello/);

		expectFail(() => assert.match("hello world", "nope"));
	});
});

describe("assert (objects and collections)", ({ assert, it }) => {
	it("containKey - should check key presence", () => {
		assert.containKey({ hello: "world" }, "hello");
		assert.containKey({ key: undefined }, "key"); // present keys count even when undefined

		expectFail(() => assert.containKey({ hello: "world" }, "nope"), "Expected object to contain key [nope].");

		// Not...
		assert.not.containKey({ hello: "world" }, "nope");

		expectFail(() => assert.not.containKey({ hello: "world" }, "hello"), "Expected object not to contain key [hello].");
	});

	it("containKeys - should check that every key is present", () => {
		assert.containKeys({ a: 1, b: 2, c: 3 }, ["a", "b"]);

		expectFail(() => assert.containKeys({ a: 1 }, ["a", "b"]), "Expected object to contain key [b].");
	});

	it("containValues - should check value presence", () => {
		assert.containValues({ hello: "world" }, "world");

		expectFail(() => assert.containValues({ hello: "world" }, "nope"), "Expected object to contain value");
	});

	it("includeAllMembers - should check that every item is included", () => {
		assert.includeAllMembers([1, 2, 3], [1, 3]);
		assert.includeAllMembers([1], []); // vacuously true

		expectFail(() => assert.includeAllMembers([1, 2], [2, 9]), "Expected values to include: [ 9 ]");
	});

	it("empty - should pass for empty strings, arrays, objects and nullish values", () => {
		assert.empty("");
		assert.empty([]);
		assert.empty({});
		assert.empty(null);
		assert.empty(undefined);

		expectFail(() => assert.empty("a"), "Expected value to be empty");
		expectFail(() => assert.empty([1]), "Expected value to be empty");
		expectFail(() => assert.empty({ a: 1 }), "Expected value to be empty");
	});

	it("not.empty - should pass for non-empty strings, arrays and objects", () => {
		assert.not.empty("a");
		assert.not.empty([1]);
		assert.not.empty({ a: 1 });

		expectFail(() => assert.not.empty(""), "Expected value not to be empty.");
		expectFail(() => assert.not.empty([]), "Expected value not to be empty.");
		expectFail(() => assert.not.empty({}), "Expected value not to be empty.");
		expectFail(() => assert.not.empty(null), "Expected value not to be empty.");
		expectFail(() => assert.not.empty(undefined), "Expected value not to be empty.");
	});
});

describe("assert (schemas)", ({ assert, it, schema }) => {
	it("matchesObject - should pass when the value matches the shape", () => {
		assert.matchesObject({ hello: "world" }, { hello: schema.string() });
	});

	it("matchesObject - should allow unknown keys", () => {
		assert.matchesObject({ extra: 1, hello: "world" }, { hello: schema.string() });
	});

	it("matchesObject - should report zod issues on mismatch", () => {
		expectFail(() => assert.matchesObject({ hello: 1 }, { hello: schema.string() }), "Invalid input");
	});

	it("not.matchesObject - should pass when the value does not match the shape", () => {
		assert.not.matchesObject({ hello: 1 }, { hello: schema.string() });

		expectFail(
			() => assert.not.matchesObject({ hello: "world" }, { hello: schema.string() }),
			"Expected value not to match the given schema.",
		);
	});
});

describe("assert (throws)", ({ assert, it }) => {
	it("should pass when the function throws and fail when it does not", () => {
		assert.throws(() => {
			throw new Error("boom");
		});

		expectFail(() => assert.throws(() => {}), "Expected function to throw");
	});

	it("should match string expectations literally, including regex special characters", () => {
		assert.throws(() => {
			throw new Error("boom (1) [a] $x");
		}, "boom (1) [a] $x");

		assert.throws(() => {
			throw new Error("prefix boom suffix");
		}, "boom"); // substring match

		expectFail(() =>
			assert.throws(() => {
				throw new Error("actual");
			}, "expected"),
		);
	});

	it("should match RegExp expectations against the message", () => {
		assert.throws(() => {
			throw new Error("boom 42");
		}, /boom \d+/);

		expectFail(() =>
			assert.throws(() => {
				throw new Error("boom");
			}, /\d+/),
		);
	});

	it("should treat built-in error classes as instanceof checks", () => {
		assert.throws(() => {
			throw new TypeError("boom");
		}, TypeError);

		assert.throws(() => {
			throw new TypeError("boom");
		}, Error); // subclass instances match their parent

		expectFail(() =>
			assert.throws(() => {
				throw new RangeError("boom");
			}, TypeError),
		);
	});

	it("should treat custom error classes as instanceof checks", () => {
		class CustomError extends Error {}

		assert.throws(() => {
			throw new CustomError("boom");
		}, CustomError);

		expectFail(() =>
			assert.throws(() => {
				throw new Error("boom");
			}, CustomError),
		);
	});

	it("should treat plain functions as predicates", () => {
		assert.throws(
			() => {
				throw new Error("boom");
			},
			(error: Error) => error.message === "boom",
		);

		expectFail(() =>
			assert.throws(
				() => {
					throw new Error("boom");
				},
				() => false,
			),
		);
	});
});

describe("assert (rejects and resolves)", ({ assert, it }) => {
	it("rejects - should pass for any rejection when no expectation is given", async () => {
		await assert.rejects(async () => {
			throw new Error("boom");
		});

		await assert.rejects(() => {
			throw new Error("sync throw"); // synchronous throws count as rejections
		});
	});

	it("rejects - should fail when the promise resolves", async () => {
		await expectFailAsync(() => assert.rejects(async () => {}), "Expected promise to be rejected but it resolved.");
	});

	it("rejects - should match string expectations against the message and name", async () => {
		await assert.rejects(async () => {
			throw new Error("boom");
		}, "boom");

		await assert.rejects(async () => {
			throw new TypeError("boom");
		}, "TypeError"); // matches the error name

		await assert.rejects(async () => {
			throw "raw string"; // non-Error rejections are wrapped
		}, "raw string");

		await expectFailAsync(
			() =>
				assert.rejects(async () => {
					throw new Error("actual");
				}, "expected"),
			'Expected rejection message to include "expected"',
		);
	});

	it("rejects - should match error classes by instance", async () => {
		await assert.rejects(async () => {
			throw new TypeError("boom");
		}, TypeError);

		await expectFailAsync(() =>
			assert.rejects(async () => {
				throw new RangeError("boom");
			}, TypeError),
		);
	});

	it("rejects - should match error instances by type and message", async () => {
		await assert.rejects(async () => {
			throw new TypeError("boom");
		}, new TypeError("boom"));

		await expectFailAsync(() =>
			assert.rejects(async () => {
				throw new TypeError("other");
			}, new TypeError("boom")),
		);
	});

	it("rejects - should support multiple expectations", async () => {
		await assert.rejects(
			async () => {
				throw new TypeError("boom");
			},
			TypeError,
			"boom",
		);
	});

	it("rejects - should rethrow assertion failures raised inside the callback", async () => {
		let caught: unknown;

		try {
			await assert.rejects(async () => {
				assert.true(false);
			});
		} catch (error) {
			caught = error;
		}

		assert.instance(caught, Assertion);
	});

	it("resolves - should pass when the promise resolves", async () => {
		await assert.resolves(async () => "value");
	});

	it("resolves - should fail with the rejection message when the promise rejects", async () => {
		await expectFailAsync(
			() =>
				assert.resolves(async () => {
					throw new Error("boom");
				}),
			"Expected promise to be resolved but it rejected with: boom",
		);
	});

	it("resolves - should rethrow assertion failures raised inside the callback", async () => {
		let caught: unknown;

		try {
			await assert.resolves(async () => {
				assert.true(false);
			});
		} catch (error) {
			caught = error;
		}

		assert.instance(caught, Assertion);
	});
});

describe("assert (snapshots)", ({ assert, it }) => {
	const snapshotPath = (name: string): string => join(process.cwd(), "snapshots", `${name}.snapshot`);

	it("should match committed snapshots", () => {
		assert.snapshot("object", { hello: "world" });
		assert.snapshot("number", 1);
		assert.snapshot("hello", "hello");
		assert.snapshot("true", true);
		assert.snapshot("false", false);
		assert.snapshot("nan", Number.NaN);
	});

	it("should create the snapshots directory when it does not exist", () => {
		const previous = process.cwd();
		const directory = mkdtempSync(join(tmpdir(), "test-runner-snapshots-"));

		process.chdir(directory);

		try {
			assert.snapshot("tmp-dir-created", { fresh: true });

			assert.true(existsSync(join(directory, "snapshots", "tmp-dir-created.snapshot")));
		} finally {
			process.chdir(previous);
			rmSync(directory, { force: true, recursive: true });
		}
	});

	it("should create the snapshot file when it does not exist", () => {
		const name = "tmp-snapshot-created";

		try {
			assert.snapshot(name, { fresh: true });

			assert.true(existsSync(snapshotPath(name)));
		} finally {
			unlinkSync(snapshotPath(name));
		}
	});

	it("should fail when the value does not match the stored snapshot", () => {
		const name = "tmp-snapshot-mismatch";
		writeFileSync(snapshotPath(name), "'something else'\n");

		try {
			expectFail(() => assert.snapshot(name, { hello: "world" }));
		} finally {
			unlinkSync(snapshotPath(name));
		}
	});

	it("should rewrite the snapshot when --update-snapshots is passed", () => {
		const name = "tmp-snapshot-update";
		writeFileSync(snapshotPath(name), "'old'\n");

		process.argv.push("--update-snapshots");

		try {
			assert.snapshot(name, "new");

			assert.is(readFileSync(snapshotPath(name), "utf8"), "'new'\n");
		} finally {
			process.argv.pop();
			unlinkSync(snapshotPath(name));
		}
	});
});
