import sinon from "sinon";

import { describe } from "./describe";
import { Stub } from "./stub";

describe("Stub", ({ assert, it }) => {
	it("returnValue - should return the configured value and chain", () => {
		const stub = new Stub(sinon.stub());

		assert.is(stub.returnValue("value"), stub);
		assert.is(stub.call(), "value");
		assert.is(stub.call(), "value");
	});

	it("returnValueOnce - should only apply to the first call", () => {
		const stub = new Stub(sinon.stub());

		stub.returnValueOnce("first");

		assert.is(stub.call(), "first");
		assert.undefined(stub.call());
	});

	it("returnValueNth - should apply to the given call only", () => {
		const stub = new Stub(sinon.stub());

		stub.returnValueNth(1, "second");

		assert.undefined(stub.call());
		assert.is(stub.call(), "second");
		assert.undefined(stub.call());
	});

	it("returnValueSequence - should return the values in order", () => {
		const stub = new Stub(sinon.stub());

		stub.returnValueSequence(["a", "b"]);

		assert.is(stub.call(), "a");
		assert.is(stub.call(), "b");
		assert.undefined(stub.call());
	});

	it("resolvedValue - should resolve with the configured value", async () => {
		const stub = new Stub(sinon.stub());

		stub.resolvedValue("value");

		assert.is(await stub.call(), "value");
	});

	it("resolvedValueNth - should resolve the given call only", async () => {
		const stub = new Stub(sinon.stub());

		stub.resolvedValueNth(0, "first");
		stub.resolvedValueNth(1, "second");

		assert.is(await stub.call(), "first");
		assert.is(await stub.call(), "second");
	});

	it("resolvedValueSequence - should resolve the values in order", async () => {
		const stub = new Stub(sinon.stub());

		stub.resolvedValueSequence(["a", "b"]);

		assert.is(await stub.call(), "a");
		assert.is(await stub.call(), "b");
	});

	it("rejectedValue - should reject with the configured error", async () => {
		const stub = new Stub(sinon.stub());

		stub.rejectedValue(new Error("boom"));

		await assert.rejects(() => stub.call() as Promise<unknown>, "boom");
	});

	it("rejectedValueNth - should reject the given call only", async () => {
		const stub = new Stub(sinon.stub());

		stub.rejectedValueNth(0, new Error("first"));

		await assert.rejects(() => stub.call() as Promise<unknown>, "first");
	});

	it("rejectedValueSequence - should reject the errors in order", async () => {
		const stub = new Stub(sinon.stub());

		stub.rejectedValueSequence([new Error("first"), new Error("second")]);

		await assert.rejects(() => stub.call() as Promise<unknown>, "first");
		await assert.rejects(() => stub.call() as Promise<unknown>, "second");
	});

	it("callsFake - should delegate to the replacement", () => {
		const stub = new Stub(sinon.stub());

		stub.callsFake((value) => (value as number) * 2);

		assert.is(stub.call(21), 42);
	});

	it("callsFakeNth - should delegate the given call only", () => {
		const stub = new Stub(sinon.stub());

		stub.callsFakeNth(1, () => "faked");

		assert.undefined(stub.call());
		assert.is(stub.call(), "faked");
	});

	it("should record calls like a fake", () => {
		const stub = new Stub(sinon.stub());

		stub.returnValue("value");
		stub.call(1, 2);

		stub.calledOnce();
		stub.calledWith(1, 2);
	});

	it("should stub and restore object methods", () => {
		const original = (name: string) => `hi ${name}`;
		const target = { greet: original };
		const stub = new Stub(sinon.stub(target, "greet"));

		stub.returnValue("stubbed");

		assert.is(target.greet("ann"), "stubbed");

		stub.restore();

		assert.is(target.greet, original);
		assert.is(target.greet("ann"), "hi ann");
	});
});
