import type { Context, Test } from "uvu";

import kleur from "kleur";
import sinon from "sinon";
import { suite } from "uvu";
import { z as schema } from "zod";

import type { EachCallback } from "./each.js";

import { assert } from "./assert.js";
import { each, formatName } from "./each.js";
import { runHook } from "./hooks.js";
import { loader } from "./loader.js";
import { nock } from "./nock.js";
import { Spy } from "./spy.js";
import { Stub } from "./stub.js";

type ContextFunction<T> = () => T;
type ContextCallback<T> = (context: T) => Promise<void> | void;

interface CallbackArguments<T> {
	afterAll: (callback_: ContextCallback<T>) => void;
	afterEach: (callback_: ContextCallback<T>) => void;
	assert: typeof assert;
	beforeAll: (callback_: ContextCallback<T>) => void;
	beforeEach: (callback_: ContextCallback<T>) => void;
	clock: (config?: number | Date | { now?: number | Date | undefined }) => sinon.SinonFakeTimers;

	dataset: unknown;

	each: <TDataset>(name: string, callback: EachCallback<TDataset, T>, datasets: TDataset[]) => void;

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
type CallbackFunction<T> = (arguments_: CallbackArguments<T>) => void;

const runSuite = <T = Context>(suite: Test<T>, callback: CallbackFunction<T>, dataset?: unknown): void => {
	const clocks: sinon.SinonFakeTimers[] = [];
	const stubs: Stub[] = [];
	const spies: Spy[] = [];

	// Fakes created before the first test (in the describe body or a beforeAll hook)
	// are suite-level: they survive across tests and are only restored once the suite
	// ends. Everything created later is restored after each test.
	let suiteClocks = 0;
	let suiteStubs = 0;
	let suiteSpies = 0;

	suite.before(() => {
		nock.disableNetConnect();
	});

	callback({
		afterAll: (callback_: ContextCallback<T>) => suite.after(runHook(callback_)),
		afterEach: (callback_: ContextCallback<T>) => suite.after.each(runHook(callback_)),
		assert,
		beforeAll: (callback_: ContextCallback<T>) => suite.before(runHook(callback_)),
		beforeEach: (callback_: ContextCallback<T>) => suite.before.each(runHook(callback_)),
		clock: (config?: number | Date | { now?: number | Date | undefined }) => {
			const result: sinon.SinonFakeTimers = sinon.useFakeTimers(config);

			clocks.push(result);

			return result;
		},
		dataset,
		each: each(suite),
		it: suite,
		loader,
		match: sinon.match,
		nock,
		only: suite.only,
		schema,
		skip: suite.skip,
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
	suite.before(() => {
		suiteClocks = clocks.length;
		suiteStubs = stubs.length;
		suiteSpies = spies.length;
	});

	suite.after.each(() => {
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

	suite.after(() => {
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

	suite.run();
};

export const describe = <T = Context>(title: string, callback: CallbackFunction<T>): void =>
	runSuite<T>(suite<T>(title), callback);

export const describeWithContext = <T = Context>(
	title: string,
	context: Context | ContextFunction<T>,
	callback: CallbackFunction<T>,
): void => runSuite<T>(suite<T>(title, typeof context === "function" ? context() : context), callback);

export const describeEach = <T = Context>(title: string, callback: CallbackFunction<T>, datasets: unknown[]): void => {
	for (const dataset of datasets) {
		runSuite<T>(suite<T>(formatName(title, dataset)), callback);
	}
};

export const describeSkip = <T = Context>(title: string, callback: CallbackFunction<T>): void =>
	console.log(`${kleur.bold(kleur.bgYellow(kleur.black("Ignored test suite")))}: ${kleur.yellow(title)}`);
