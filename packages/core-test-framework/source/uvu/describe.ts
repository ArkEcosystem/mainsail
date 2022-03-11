import sinon from "sinon";
import { Callback, Context, suite, Test } from "uvu";
import { z as schema } from "zod";

import { assert } from "./assert";
import { each, formatName } from "./each";
import { runHook } from "./hooks";
import { loader } from "./loader";
import { nock } from "./nock";
import { Spy } from "./spy";
import { Stub } from "./stub";

type ContextFunction<T> = () => T;
type ContextCallback<T> = (context: T) => Promise<void> | void;

interface CallbackArguments<T> {
	afterAll: (callback_: ContextCallback<T>) => void;
	afterEach: (callback_: ContextCallback<T>) => void;
	assert: typeof assert;
	beforeAll: (callback_: ContextCallback<T>) => void;
	beforeEach: (callback_: ContextCallback<T>) => void;
	clock: (config?: number | Date | Partial<sinon.SinonFakeTimersConfig>) => sinon.SinonFakeTimers;
	dataset: unknown;
	each: (name: string, callback: Callback<any>, datasets: unknown[]) => void;
	it: Test<T>;
	loader: typeof loader;
	match: sinon.SinonMatch;
	nock: typeof nock;
	only: Function;
	schema: typeof schema;
	skip: Function;
	spy: (owner?: object, method?: string) => Spy;
	spyFn: () => Spy;
	stub: (owner: object, method: string) => Stub;
	stubFn: () => Stub;
}

type CallbackFunction<T> = (arguments_: CallbackArguments<T>) => void;

const runSuite = <T = Context>(suite: Test<T>, callback: CallbackFunction<T>, dataset?: unknown): void => {
	let clocks: sinon.SinonFakeTimers[] = [];
	let stubs: Stub[] = [];
	let spies: Spy[] = [];

	suite.before(() => {
		nock.disableNetConnect();
	});

	suite.after(() => {
		nock.enableNetConnect();
	});

	suite.after.each(() => {
		nock.cleanAll();

		for (const clock of clocks) {
			clock.restore();
		}

		for (const stub of stubs) {
			stub.restore();
		}

		for (const spy of spies) {
			spy.restore();
		}

		clocks = [];
		stubs = [];
		spies = [];
	});

	callback({
		afterAll: async (callback_: ContextCallback<T>) => suite.after(runHook(callback_)),
		afterEach: async (callback_: ContextCallback<T>) => suite.after.each(runHook(callback_)),
		assert,
		beforeAll: async (callback_: ContextCallback<T>) => suite.before(runHook(callback_)),
		beforeEach: async (callback_: ContextCallback<T>) => suite.before.each(runHook(callback_)),
		clock: (config?: number | Date | Partial<sinon.SinonFakeTimersConfig>) => {
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
