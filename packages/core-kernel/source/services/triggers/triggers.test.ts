import { describe } from "../../../../core-test-framework";

import { InvalidArgumentException } from "../../exceptions/logic";
import { Triggers } from "./triggers";
import { Action } from "./action";
import { ActionArguments } from "../../types";
import sinon from "sinon";

class DummyAction extends Action {
	public execute<T>(args: ActionArguments): T {
		return args.returnValue;
	}
}

class DummyActionWithException extends Action {
	public execute<T>(): T {
		throw new Error("Hello World");
	}
}

const dummyParams = {
	returnValue: false,
};

describe<{
	triggers: Triggers;
}>("Triggers", ({ assert, beforeEach, it, spy, spyFn, stub, stubFn }) => {
	beforeEach((context) => {
		context.triggers = new Triggers();
	});

	it("binds a trigger and accepts arguments for calls", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyAction()).before(before);

		assert.is(
			await context.triggers.call<boolean>("count", {
				returnValue: "Hello World",
			}),
			"Hello World",
		);
		assert.true(before.calledOnce);
	});

	it("binds a trigger and throws error from execute", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyActionWithException()).before(before);

		await assert.rejects(() =>
			context.triggers.call<boolean>("count", {
				returnValue: "Hello World",
			}),
		);
		assert.true(before.calledOnce);
	});

	it("binds a trigger with a <before> hook and executes them", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyAction()).before(before);

		assert.undefined(await context.triggers.call<boolean>("count"));
		assert.true(before.calledOnce);
	});

	it("binds a trigger with an <error> hook and executes them", async (context) => {
		const error = spyFn();

		context.triggers.bind("count", new DummyActionWithException()).error(error);

		assert.undefined(await context.triggers.call<boolean>("count"));
		assert.true(error.calledOnce);
	});

	it("binds a trigger with an <after> hook and executes them", async (context) => {
		const after = spyFn();

		context.triggers.bind("count", new DummyAction()).after(after);

		assert.undefined(await context.triggers.call<boolean>("count"));
		assert.true(after.called);
	});

	it("binds a trigger with <before/error/after> hooks and executes them", async (context) => {
		const before = spyFn();
		const error = spyFn();
		const after = spyFn();

		context.triggers.bind("count", new DummyActionWithException()).before(before).error(error).after(after);

		assert.undefined(await context.triggers.call<boolean>("count"));
		assert.true(before.calledOnce);
		assert.true(error.calledOnce);
		assert.true(after.notCalled);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		await assert.rejects(
			() => context.triggers.call("count"),
			InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("throws an error if a trigger is already registered", async (context) => {
		context.triggers.bind("duplicate", new DummyAction());

		assert.rejects(
			() => {
				context.triggers.bind("duplicate", new DummyAction());
			},
			InvalidArgumentException,
			"The given trigger [duplicate] is already registered.",
		);
	});

	it("throws an error if a trigger is reserved", async (context) => {
		assert.rejects(
			() => {
				context.triggers.bind("internal.trigger", new DummyAction());
			},
			InvalidArgumentException,
			"The given trigger [internal.trigger] is reserved.",
		);
	});

	it("returns and remove the trigger", async (context) => {
		context.triggers.bind("count", new DummyAction());

		assert.instance(context.triggers.get("count"), DummyAction);

		assert.instance(context.triggers.unbind("count"), Action);

		assert.rejects(
			() => context.triggers.get("count"),
			InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		assert.rejects(
			() => context.triggers.unbind("count"),
			InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("returns new trigger and replaces it", async (context) => {
		const trigger1 = new DummyAction();
		const trigger2 = new DummyAction();

		context.triggers.bind("count", trigger1);

		assert.is(context.triggers.get("count"), trigger1);

		assert.is(context.triggers.rebind("count", trigger2), trigger2);

		assert.is(context.triggers.get("count"), trigger2);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		assert.rejects(
			() => context.triggers.rebind("count", new DummyAction()),
			InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("returns a trigger by name", async (context) => {
		context.triggers.bind("count", new DummyAction());

		assert.instance(context.triggers.get("count"), Action);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		assert.rejects(
			() => context.triggers.get("count"),
			InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("should call error action if error is thrown on <before> hook", async (context) => {
		const before = stubFn().callsFake(() => {
			throw new Error();
		});
		const error = spyFn();
		context.triggers.bind("count", new DummyAction()).before(before).error(error);

		assert.undefined(await context.triggers.call<boolean>("count", dummyParams));
		assert.true(before.calledOnce);
		assert.true(error.calledWith(dummyParams, undefined, sinon.match.instanceOf(Error), "before"));
	});

	it("should throw error if error is thrown on <before> hook and no error handlers are defined", async (context) => {
		const before = stubFn().callsFake(() => {
			throw new Error();
		});
		context.triggers.bind("count", new DummyAction()).before(before);

		await assert.rejects(() => context.triggers.call<boolean>("count", dummyParams));
		assert.true(before.calledOnce);
	});

	it("should call error action if error is thrown on execute", async (context) => {
		const error = spyFn();
		context.triggers.bind("count", new DummyActionWithException()).error(error);

		assert.undefined(await context.triggers.call<boolean>("count", dummyParams));
		assert.true(
			error.calledWith(
				dummyParams,
				undefined,
				sinon.match((o) => {
					return o instanceof Error && o.message === "Hello World";
				}),
				"execute",
			),
		);
	});

	it("should throw error if error is thrown on execute and no error handlers are defined", async (context) => {
		context.triggers.bind("count", new DummyActionWithException());

		await assert.rejects(() => context.triggers.call<boolean>("count"));
	});

	it("should call error action and return result if error is thrown on <after> hook", async (context) => {
		const after = stubFn().callsFake(() => {
			throw new Error();
		});
		const error = spyFn();
		context.triggers.bind("count", new DummyAction()).after(after).error(error);

		assert.is(await context.triggers.call<boolean>("count", dummyParams), dummyParams.returnValue);
		assert.true(after.called);
		assert.true(error.calledWith(dummyParams, dummyParams.returnValue, sinon.match.instanceOf(Error), "after"));
	});

	it("should throw error if error is thrown on <after> hook and no error handlers are defined", async (context) => {
		const after = stubFn().callsFake(() => {
			throw new Error();
		});
		context.triggers.bind("count", new DummyAction()).after(after);

		await assert.rejects(() => context.triggers.call<boolean>("count", dummyParams));
		assert.true(after.called);
	});
});
