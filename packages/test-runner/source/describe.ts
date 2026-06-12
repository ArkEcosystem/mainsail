import type { Context, Test } from "uvu";

import kleur from "kleur";
import sinon from "sinon";
import { suite } from "uvu";
import { z as schema } from "zod";

import type { Each } from "./each.js";

import { assert } from "./assert.js";
import { each, formatName } from "./each.js";
import { runHook } from "./hooks.js";
import { loader } from "./loader.js";
import { nock } from "./nock.js";
import { Spy } from "./spy.js";
import { Stub } from "./stub.js";

type ContextFunction<T> = () => T;
type ContextCallback<T> = (context: T) => Promise<void> | void;

interface CallbackArguments<T, TDataset = unknown> {
	afterAll: (callback_: ContextCallback<T>) => void;
	afterEach: (callback_: ContextCallback<T>) => void;
	assert: typeof assert;
	beforeAll: (callback_: ContextCallback<T>) => void;
	beforeEach: (callback_: ContextCallback<T>) => void;
	clock: (config?: Parameters<typeof sinon.useFakeTimers>[0]) => sinon.SinonFakeTimers;

	dataset: TDataset;

	each: Each<T>;

	it: Test<T>;
	loader: typeof loader;
	match: sinon.SinonMatch;
	nock: typeof nock;
	only: Test<T>["only"];
	schema: typeof schema;
	skip: Test<T>["skip"];
	spy: (owner: object, method: string) => Spy;
	spyFn: () => Spy;
	stub: (owner: object, method: string) => Stub;
	stubFn: () => Stub;
}
type CallbackFunction<T, TDataset = unknown> = (arguments_: CallbackArguments<T, TDataset>) => void;

const runSuite = <T = Context, TDataset = unknown>(
	test: Test<T>,
	callback: CallbackFunction<T, TDataset>,
	dataset: TDataset,
): void => {
	const clocks: sinon.SinonFakeTimers[] = [];
	const stubs: Stub[] = [];
	const spies: Spy[] = [];

	// Fakes created before the first test (in the describe body or a beforeAll hook)
	// are suite-level: they survive across tests and are only restored once the suite
	// ends. Everything created later is restored after each test.
	let suiteClocks = 0;
	let suiteStubs = 0;
	let suiteSpies = 0;

	test.before(() => {
		nock.disableNetConnect();
	});

	callback({
		afterAll: (callback_: ContextCallback<T>) => test.after(runHook(callback_)),
		afterEach: (callback_: ContextCallback<T>) => test.after.each(runHook(callback_)),
		assert,
		beforeAll: (callback_: ContextCallback<T>) => test.before(runHook(callback_)),
		beforeEach: (callback_: ContextCallback<T>) => test.before.each(runHook(callback_)),
		clock: (config?: Parameters<typeof sinon.useFakeTimers>[0]) => {
			const result: sinon.SinonFakeTimers = sinon.useFakeTimers(config);

			clocks.push(result);

			return result;
		},
		dataset,
		each: each(test),
		it: test,
		loader,
		match: sinon.match,
		nock,
		only: (name, handler) => test.only(name, handler),
		schema,
		skip: (name, handler) => test.skip(name, handler),
		spy: (owner: object, method: string) => {
			const result: Spy = new Spy(sinon.spy(owner, method as never));

			spies.push(result);

			return result;
		},
		spyFn: () => new Spy(sinon.spy()),
		stub: (owner: object, method: string) => {
			const result: Stub = new Stub(sinon.stub(owner, method as never));

			stubs.push(result);

			return result;
		},
		stubFn: () => new Stub(sinon.stub()),
	});

	// Registered after the user's hooks so the snapshot runs after all beforeAll
	// hooks, and cleanup runs after the user's afterEach/afterAll hooks — user
	// teardown still sees active fakes.
	test.before(() => {
		suiteClocks = clocks.length;
		suiteStubs = stubs.length;
		suiteSpies = spies.length;
	});

	test.after.each(() => {
		nock.cleanAll();

		for (const clock of clocks.splice(suiteClocks)) {
			clock.restore();
		}

		for (const stub of stubs.splice(suiteStubs)) {
			stub.restore();
		}

		for (const spy of spies.splice(suiteSpies)) {
			spy.restore();
		}
	});

	test.after(() => {
		nock.enableNetConnect();

		for (const clock of clocks.splice(0)) {
			clock.restore();
		}

		for (const stub of stubs.splice(0)) {
			stub.restore();
		}

		for (const spy of spies.splice(0)) {
			spy.restore();
		}
	});

	test.run();
};

export const describe = <T = Context>(title: string, callback: CallbackFunction<T>): void =>
	runSuite<T>(suite<T>(title), callback, undefined);

export const describeWithContext = <T = Context>(
	title: string,
	context: T | ContextFunction<T>,
	callback: CallbackFunction<T>,
): void =>
	runSuite<T>(
		suite<T>(title, typeof context === "function" ? (context as ContextFunction<T>)() : context),
		callback,
		undefined,
	);

export const describeEach = <T = Context, TDataset = unknown>(
	title: string,
	callback: CallbackFunction<T, TDataset>,
	datasets: TDataset[],
): void => {
	for (const dataset of datasets) {
		runSuite<T, TDataset>(suite<T>(formatName(title, dataset)), callback, dataset);
	}
};

export const describeSkip = <T = Context>(title: string, callback: CallbackFunction<T>): void =>
	console.log(`${kleur.bold(kleur.bgYellow(kleur.black("Ignored test suite")))}: ${kleur.yellow(title)}`);
