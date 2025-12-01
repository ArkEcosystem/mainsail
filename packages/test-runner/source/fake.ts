import { not, ok } from "uvu/assert";

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
		ok(this.subject.called);
	}
	public calledWith(...arguments_: TArguments): void {
		ok(this.subject.calledWith(...arguments_));
	}

	public notCalledWith(...arguments_: TArguments): void {
		not.ok(this.subject.calledWith(...arguments_));
	}

	public calledNthWith(index: number, ...arguments_: TArguments): void {
		if (this.subject.callCount <= index) {
			throw new Error(`Failed to get arguments for call#${index}`);
		}

		ok(this.subject.getCall(index).calledWith(...arguments_));
	}

	public calledOnce(): void {
		this.calledTimes(1);
	}

	public calledTimes(times: number): void {
		ok(this.subject.callCount === times);
	}

	public neverCalled(): void {
		this.calledTimes(0);
	}

	public getCallArgs(index: number): TArguments {
		if (this.subject.callCount > index) {
			return this.subject.getCall(index).args;
		}

		throw new Error(`Failed to get arguments for call#${index}`);
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
}
