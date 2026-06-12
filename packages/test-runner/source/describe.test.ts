import { describe, describeWithContext } from "./describe";

describe("Date.now()", ({ assert, beforeAll, beforeEach, afterAll, skip, it }) => {
	let _Date;
	let count = 0;

	beforeAll(() => {
		_Date = global.Date;
		global.Date = { now: () => 100 + count++ };
	});

	beforeEach(() => {
		count = 0;
	});

	afterAll(() => {
		global.Date = _Date;
	});

	skip("should be a function", () => {
		assert.type(Date.now, "function");
	});

	it("should return a number", () => {
		assert.type(Date.now(), "number");
	});

	it("should progress with time", () => {
		assert.is(Date.now(), 100);
		assert.is(Date.now(), 101);
		assert.is(Date.now(), 102);
	});
});

describe("Only", ({ assert, it, only }) => {
	only("should be the only test that runs", () => {
		assert.true(true);
	});

	it("should never run when another test uses only", () => {
		assert.unreachable();
	});
});

describe("Datasets", ({ assert, each }) => {
	each(
		"number %s should be greater than 0",
		({ dataset }) => {
			assert.true(dataset > 0);
		},
		Array.from({ length: 32 }, (_, index) => index + 1),
	);
});

describeWithContext("Context (Object)", { hello: "world" }, ({ assert, it, nock, loader }) => {
	it("should have context from an object", (context) => {
		assert.is(context.hello, "world");
	});
});

describeWithContext(
	"Context (Function)",
	() => ({ hello: "world" }),
	({ assert, it, nock, loader }) => {
		it("should have context from an object", (context) => {
			assert.is(context.hello, "world");
		});
	},
);
