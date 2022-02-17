import { SinonSpyStatic, spy } from "sinon";
import { Callback, Context, suite, Test } from "uvu";
import { z as schema } from "zod";

import { assert } from "./assert.js";
import { each, formatName } from "./each.js";
import { runHook } from "./hooks.js";
import { loader } from "./loader.js";
import { nock } from "./nock.js";
import { Stub } from "./stub.js";

type ContextFunction = () => Context;

interface CallbackArguments {
    afterAll: (callback_: Function) => void;
    afterEach: (callback_: Function) => void;
    assert: typeof assert;
    beforeAll: (callback_: Function) => void;
    beforeEach: (callback_: Function) => void;
    dataset: unknown;
    each: (name: string, callback: Callback<any>, datasets: unknown[]) => void;
    it: Test;
    loader: typeof loader;
    nock: typeof nock;
    only: Function;
    schema: typeof schema;
    skip: Function;
    spy: SinonSpyStatic;
    stub: (owner: object, method: string) => Stub;
}

type CallbackFunction = (args: CallbackArguments) => void;

const runSuite = (suite: Test, callback: CallbackFunction, dataset?: unknown): void => {
    let stubs: Stub[] = [];

    suite.before(() => {
        nock.disableNetConnect();
    });

    suite.after(() => {
        nock.enableNetConnect();
    });

    suite.after.each(() => {
        nock.cleanAll();

        for (const stub of stubs) {
            stub.restore();
        }

        stubs = [];
    });

    callback({
        afterAll: async (callback_: Function) => suite.after(runHook(callback_)),
        afterEach: async (callback_: Function) => suite.after.each(runHook(callback_)),
        assert,
        beforeAll: async (callback_: Function) => suite.before(runHook(callback_)),
        beforeEach: async (callback_: Function) => suite.before.each(runHook(callback_)),
        dataset,
        each: each(suite),
        it: suite,
        loader,
        nock,
        only: suite.only,
        schema,
        skip: suite.skip,
        spy,
        stub: (owner: object, method: string) => {
            const result: Stub = new Stub(owner, method);

            stubs.push(result);

            return result;
        },
    });

    suite.run();
};

export const describe = (title: string, callback: CallbackFunction): void => runSuite(suite(title), callback);

export const describeWithContext = (
    title: string,
    context: Context | ContextFunction,
    callback: CallbackFunction,
): void => runSuite(suite(title, typeof context === "function" ? context() : context), callback);

export const describeEach = (title: string, callback: CallbackFunction, datasets: unknown[]): void => {
    for (const dataset of datasets) {
        runSuite(suite(formatName(title, dataset)), callback);
    }
};
