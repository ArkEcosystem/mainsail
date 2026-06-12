import { inspect } from "node:util";
import { is, not, ok } from "uvu/assert";

import type { Fake as FakeInterface } from "./contracts.js";

export type FakeCall<TArguments extends unknown[]> = {
	args: TArguments;
	calledWith(...arguments_: TArguments): boolean;
};

export type FakeLike<TArguments extends unknown[], TResult> = ((...arguments_: TArguments) => TResult) & {
	calledWith(...arguments_: TArguments): boolean;
	called: boolean;
	getCall(index: number): FakeCall<TArguments>;
	callCount: number;
	restore(): void;
	resetHistory(): void;
};

export abstract class Fake<TArguments extends unknown[], TResult> implements FakeInterface<TArguments, TResult> {
	protected readonly subject: FakeLike<TArguments, TResult>;

	public constructor(subject: FakeLike<TArguments, TResult>) {
		this.subject = subject;
	}

	public call(...arguments_: TArguments): TResult {
		return this.subject(...arguments_);
	}

	public called(): void {
		ok(this.subject.called, "Expected fake to be called at least once.");
	}
	public calledWith(...arguments_: TArguments): void {
		ok(this.subject.calledWith(...arguments_), `Expected fake to be called with: ${inspect(arguments_)}`);
	}

	public notCalledWith(...arguments_: TArguments): void {
		not.ok(this.subject.calledWith(...arguments_), `Expected fake not to be called with: ${inspect(arguments_)}`);
	}

	public calledNthWith(index: number, ...arguments_: TArguments): void {
		this.#ensureCall(index);

		ok(
			this.subject.getCall(index).calledWith(...arguments_),
			`Expected call #${index} to have arguments: ${inspect(arguments_)}`,
		);
	}

	public calledOnce(): void {
		this.calledTimes(1);
	}

	public calledTimes(times: number): void {
		is(this.subject.callCount, times);
	}

	public neverCalled(): void {
		this.calledTimes(0);
	}

	public getCallArgs(index: number): TArguments {
		this.#ensureCall(index);

		return this.subject.getCall(index).args;
	}

	public restore(): void {
		this.subject.restore();
	}

	public reset(): void {
		this.subject.resetHistory();
	}

	public toFunction(): (...arguments_: TArguments) => TResult {
		return this.subject;
	}

	#ensureCall(index: number): void {
		if (this.subject.callCount <= index) {
			throw new Error(`Call #${index} does not exist; the fake was called ${this.subject.callCount} time(s).`);
		}
	}
}
