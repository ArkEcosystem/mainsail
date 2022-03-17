import { Exceptions } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { ActionArguments } from "../../types";
import { Action } from "./action";
import { Triggers } from "./triggers";

class DummyAction extends Action {
	public execute<T>(arguments_: ActionArguments): T {
		return arguments_.returnValue;
	}
}

class DummyActionWithException extends Action {
	public execute<T>(): T {
		throw new Error("Hello World");
	}
}

const dummyParameters = {
	returnValue: false,
};

describe<{
	triggers: Triggers;
}>("Triggers", ({ assert, beforeEach, it, spy, spyFn, stub, stubFn, match }) => {
	beforeEach((context) => {
		context.triggers = new Triggers();
	});

	it("binds a trigger and accepts arguments for calls", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyAction()).before(() => {
			before.call();
		});

		assert.is(
			await context.triggers.call<boolean>("count", {
				returnValue: "Hello World",
			}),
			"Hello World",
		);
		before.calledOnce();
	});

	it("binds a trigger and throws error from execute", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyActionWithException()).before(() => {
			before.call();
		});

		await assert.rejects(() =>
			context.triggers.call<boolean>("count", {
				returnValue: "Hello World",
			}),
		);
		before.calledOnce();
	});

	it("binds a trigger with a <before> hook and executes them", async (context) => {
		const before = spyFn();

		context.triggers.bind("count", new DummyAction()).before(() => {
			before.call();
		});

		assert.undefined(await context.triggers.call<boolean>("count"));
		before.calledOnce();
	});

	it("binds a trigger with an <error> hook and executes them", async (context) => {
		const error = spyFn();

		context.triggers.bind("count", new DummyActionWithException()).error(() => {
			error.call();
		});

		assert.undefined(await context.triggers.call<boolean>("count"));
		error.calledOnce();
	});

	it("binds a trigger with an <after> hook and executes them", async (context) => {
		const after = spyFn();

		context.triggers.bind("count", new DummyAction()).after(() => {
			after.call();
		});

		assert.undefined(await context.triggers.call<boolean>("count"));
		after.calledOnce();
	});

	it("binds a trigger with <before/error/after> hooks and executes them", async (context) => {
		const before = spyFn();
		const error = spyFn();
		const after = spyFn();

		context.triggers
			.bind("count", new DummyActionWithException())
			.before(() => before.call())
			.error(() => error.call())
			.after(() => after.call());

		assert.undefined(await context.triggers.call<boolean>("count"));
		before.calledOnce();
		error.calledOnce();
		after.neverCalled();
	});

	it("throws an error if a trigger is not registered", async (context) => {
		await assert.rejects(
			() => context.triggers.call("count"),
			Exceptions.InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("throws an error if a trigger is already registered", async (context) => {
		context.triggers.bind("duplicate", new DummyAction());

		await assert.rejects(
			() => {
				context.triggers.bind("duplicate", new DummyAction());
			},
			Exceptions.InvalidArgumentException,
			"The given trigger [duplicate] is already registered.",
		);
	});

	it("throws an error if a trigger is reserved", async (context) => {
		await assert.rejects(
			() => {
				context.triggers.bind("internal.trigger", new DummyAction());
			},
			Exceptions.InvalidArgumentException,
			"The given trigger [internal.trigger] is reserved.",
		);
	});

	it("returns and remove the trigger", async (context) => {
		context.triggers.bind("count", new DummyAction());

		assert.instance(context.triggers.get("count"), DummyAction);

		assert.instance(context.triggers.unbind("count"), Action);

		await assert.rejects(
			() => context.triggers.get("count"),
			Exceptions.InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		await assert.rejects(
			() => context.triggers.unbind("count"),
			Exceptions.InvalidArgumentException,
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
		await assert.rejects(
			() => context.triggers.rebind("count", new DummyAction()),
			Exceptions.InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("returns a trigger by name", async (context) => {
		context.triggers.bind("count", new DummyAction());

		assert.instance(context.triggers.get("count"), Action);
	});

	it("throws an error if a trigger is not registered", async (context) => {
		await assert.rejects(
			() => context.triggers.get("count"),
			Exceptions.InvalidArgumentException,
			"The given trigger [count] is not available.",
		);
	});

	it("should call error action if error is thrown on <before> hook", async (context) => {
		const before = stubFn().callsFake(() => {
			throw new Error();
		});
		const error = spyFn();
		context.triggers
			.bind("count", new DummyAction())
			.before(() => {
				before.call();
			})
			.error((...arguments_) => {
				error.call(...arguments_);
			});

		assert.undefined(await context.triggers.call<boolean>("count", dummyParameters));
		before.calledOnce();
		error.calledWith(dummyParameters, undefined, match.instanceOf(Error), "before");
	});

	it("should throw error if error is thrown on <before> hook and no error handlers are defined", async (context) => {
		const before = stubFn().callsFake(() => {
			throw new Error();
		});
		context.triggers.bind("count", new DummyAction()).before(() => before.call());

		await assert.rejects(() => context.triggers.call<boolean>("count", dummyParameters));
		before.calledOnce();
	});

	it("should call error action if error is thrown on execute", async (context) => {
		const error = spyFn();
		context.triggers.bind("count", new DummyActionWithException()).error((...arguments_) => {
			error.call(...arguments_);
		});

		assert.undefined(await context.triggers.call<boolean>("count", dummyParameters));
		error.calledWith(
			dummyParameters,
			undefined,
			match((o) => o instanceof Error && o.message === "Hello World"),
			"execute",
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
		context.triggers
			.bind("count", new DummyAction())
			.after(() => {
				after.call();
			})
			.error((...arguments_) => error.call(...arguments_));
		assert.is(await context.triggers.call<boolean>("count", dummyParameters), dummyParameters.returnValue);
		after.calledOnce();
		error.calledOnce();
		error.calledWith(dummyParameters, dummyParameters.returnValue, match.instanceOf(Error), "after");
	});

	it("should throw error if error is thrown on <after> hook and no error handlers are defined", async (context) => {
		const after = stubFn().callsFake(() => {
			throw new Error();
		});
		context.triggers.bind("count", new DummyAction()).after(() => {
			after.call();
		});

		await assert.rejects(() => context.triggers.call<boolean>("count", dummyParameters));
		after.calledOnce();
	});
});
