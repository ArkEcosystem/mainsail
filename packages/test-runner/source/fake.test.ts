import sinon from "sinon";

import { describe } from "./describe";
import { Spy } from "./spy";

// Assertion failures cannot be matched with assert.throws (uvu re-throws them),
// so failing paths are verified with this local helper.
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

describe("Spy", ({ assert, it }) => {
	it("call - should invoke the underlying function and return its result", () => {
		const target = { greet: (name: string) => `hi ${name}` };
		const spy = new Spy(sinon.spy(target, "greet"));

		assert.is(spy.call("ann"), "hi ann");
	});

	it("called - should pass once invoked and fail otherwise", () => {
		const spy = new Spy(sinon.spy());

		expectFail(() => spy.called(), "Expected fake to be called at least once.");

		spy.call();

		spy.called();
	});

	it("calledWith/notCalledWith - should match recorded arguments", () => {
		const spy = new Spy(sinon.spy());

		spy.call(1, "a", { nested: true });

		spy.calledWith(1, "a", { nested: true });
		spy.notCalledWith(2, "b");

		expectFail(() => spy.calledWith(9), "Expected fake to be called with");
		expectFail(() => spy.notCalledWith(1, "a", { nested: true }), "Expected fake not to be called with");
	});

	it("calledNthWith - should match the arguments of a specific call", () => {
		const spy = new Spy(sinon.spy());

		spy.call("first");
		spy.call("second");

		spy.calledNthWith(0, "first");
		spy.calledNthWith(1, "second");

		expectFail(() => spy.calledNthWith(1, "first"), "Expected call #1 to have arguments");
	});

	it("calledNthWith/getCallArgs - should reject out-of-range and negative indexes", () => {
		const spy = new Spy(sinon.spy());

		spy.call("only");

		assert.throws(() => spy.getCallArgs(1), "Call #1 does not exist; the fake was called 1 time(s).");
		assert.throws(() => spy.getCallArgs(-1), "Call #-1 does not exist");
		assert.throws(() => spy.calledNthWith(5, "x"), "Call #5 does not exist");
	});

	it("calledOnce/calledTimes/neverCalled - should track call counts", () => {
		const spy = new Spy(sinon.spy());

		spy.neverCalled();

		spy.call();

		spy.calledOnce();

		spy.call();

		spy.calledTimes(2);

		expectFail(() => spy.calledTimes(3));
		expectFail(() => spy.neverCalled());
	});

	it("getCallArgs - should return the arguments of a call", () => {
		const spy = new Spy(sinon.spy());

		spy.call(1, { nested: true });
		spy.call("second");

		assert.equal(spy.getCallArgs(0), [1, { nested: true }]);
		assert.equal(spy.getCallArgs(1), ["second"]);
	});

	it("reset - should clear the recorded history", () => {
		const spy = new Spy(sinon.spy());

		spy.call();

		spy.calledOnce();

		spy.reset();

		spy.neverCalled();
	});

	it("restore - should reinstate the original method", () => {
		const original = (name: string) => `hi ${name}`;
		const target = { greet: original };
		const spy = new Spy(sinon.spy(target, "greet"));

		assert.true(target.greet !== original);

		spy.restore();

		assert.is(target.greet, original);
	});

	it("toFunction - should expose the underlying fake", () => {
		const spy = new Spy(sinon.spy());
		const function_ = spy.toFunction();

		function_("hello");

		spy.calledOnce();
		spy.calledWith("hello");
	});
});
