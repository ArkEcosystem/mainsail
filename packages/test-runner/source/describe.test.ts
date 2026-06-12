import { describe, describeEach, describeSkip, describeWithContext } from "./describe";

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

describeWithContext("Context (Object)", { hello: "world" }, ({ assert, it }) => {
	it("should have context from an object", (context) => {
		assert.is(context.hello, "world");
	});
});

describeWithContext(
	"Context (Function)",
	() => ({ hello: "world" }),
	({ assert, it }) => {
		it("should have context from an object", (context) => {
			assert.is(context.hello, "world");
		});
	},
);

describeEach(
	"describeEach %s",
	({ assert, dataset, it }) => {
		it("should expose the dataset to the suite", () => {
			assert.number(dataset);
			assert.gt(dataset, 0);
		});
	},
	[1, 2, 3],
);

describe("Dataset (plain describe)", ({ assert, dataset, it }) => {
	it("should be undefined when the suite has no dataset", () => {
		assert.undefined(dataset);
	});
});

const perTestTarget = { value: () => "original" };
const teardownOrder: string[] = [];

describe("Lifecycle (per-test fakes)", ({ afterEach, assert, it, stub }) => {
	afterEach(() => {
		teardownOrder.push(perTestTarget.value());
	});

	it("should stub a method within a test", () => {
		stub(perTestTarget, "value").returnValue("stubbed");

		assert.is(perTestTarget.value(), "stubbed");
	});

	it("should restore the stub before the next test", () => {
		assert.is(perTestTarget.value(), "original");
	});
});

describe("Lifecycle (teardown order)", ({ assert, it }) => {
	it("should run user afterEach hooks before fakes are restored", () => {
		assert.equal(teardownOrder, ["stubbed", "original"]);
	});
});

const suiteLevelTarget = { value: () => "original" };

describe("Lifecycle (suite-level fakes)", ({ assert, beforeAll, it, stub }) => {
	beforeAll(() => {
		stub(suiteLevelTarget, "value").returnValue("suite-stubbed");
	});

	it("should see the suite-level stub in the first test", () => {
		assert.is(suiteLevelTarget.value(), "suite-stubbed");
	});

	it("should keep the suite-level stub for later tests", () => {
		assert.is(suiteLevelTarget.value(), "suite-stubbed");
	});
});

describe("Lifecycle (suite-level fakes restore)", ({ assert, it }) => {
	it("should restore suite-level stubs once the suite ends", () => {
		assert.is(suiteLevelTarget.value(), "original");
	});
});

const originalValue = () => "original";
const suiteLevelSpyTarget = { value: originalValue };

describe("Lifecycle (suite-level spies and clocks)", ({ assert, beforeAll, clock, it, spy }) => {
	beforeAll(() => {
		clock({ now: 5000 });
		spy(suiteLevelSpyTarget, "value");
	});

	it("should keep the suite-level clock and spy active in the first test", () => {
		assert.is(Date.now(), 5000);
		assert.is(suiteLevelSpyTarget.value(), "original");
	});

	it("should keep the suite-level clock and spy active in later tests", () => {
		assert.is(Date.now(), 5000);
		assert.is(suiteLevelSpyTarget.value(), "original");
	});
});

describe("Lifecycle (suite-level spies and clocks restore)", ({ assert, it }) => {
	it("should restore the suite-level clock and spy once the suite ends", () => {
		assert.gt(Date.now(), 1_600_000_000_000);
		assert.is(suiteLevelSpyTarget.value, originalValue);
	});
});

describe("Lifecycle (spies)", ({ assert, it, spy }) => {
	it("should record calls to the spied method while delegating to the original", () => {
		const target = { greet: (name: string) => `hi ${name}` };
		const greet = spy(target, "greet");

		assert.is(target.greet("ann"), "hi ann");

		greet.calledOnce();
		greet.calledWith("ann");
	});
});

describe("clock", ({ assert, clock, it }) => {
	it("should fake timers within a test", () => {
		const fake = clock({ now: 1000 });

		assert.is(Date.now(), 1000);

		fake.tick(500);

		assert.is(Date.now(), 1500);
	});

	it("should restore real timers after each test", () => {
		assert.gt(Date.now(), 1_600_000_000_000);
	});
});

describe("spyFn / stubFn", ({ assert, it, spyFn, stubFn }) => {
	it("spyFn should create an anonymous spy", () => {
		const spy = spyFn();

		spy.call(1, 2);

		spy.calledOnce();
		spy.calledWith(1, 2);
	});

	it("stubFn should create an anonymous stub", () => {
		const stub = stubFn().returnValue("value");

		assert.is(stub.call(), "value");
	});
});

describe("Fake helper failures", ({ assert, clock, it, spy, stub }) => {
	it("stub - should throw when stubbing a missing method", () => {
		assert.throws(() => stub({}, "missing"), "Cannot stub non-existent property missing");
		assert.throws(() => stub({}, "missing"), TypeError);
	});

	it("stub - should throw when the method is already stubbed", () => {
		const target = { value: () => "original" };

		stub(target, "value");

		assert.throws(() => stub(target, "value"), "already wrapped");
	});

	it("spy - should throw when spying on a missing method", () => {
		assert.throws(() => spy({}, "missing"), TypeError);
	});

	it("clock - should throw when fake timers are already installed", () => {
		clock();

		assert.throws(() => clock(), "Can't install fake timers twice");
	});
});

describe("describeSkip", ({ assert, it, stub }) => {
	it("should log the suite as ignored without invoking the callback", () => {
		const log = stub(console, "log");
		let invoked = false;

		describeSkip("ignored suite", () => {
			invoked = true;
		});

		log.calledOnce();
		assert.false(invoked);
	});
});
