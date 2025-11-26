export interface Fake<TArguments extends unknown[], TResult> {
	call(...arguments_: TArguments): TResult;

	called(): void;
	calledWith(...arguments_: TArguments): void;
	notCalledWith(...arguments_: TArguments): void;
	calledNthWith(index: number, ...arguments_: TArguments): void;
	calledOnce(): void;
	calledTimes(times: number): void;
	neverCalled(): void;

	getCallArgs(index: number): TArguments;

	restore(): void;
	reset(): void;

	toFunction(): (...arguments_: TArguments) => TResult;
}

export interface Stub<TArguments extends unknown[], TResult> extends Fake<TArguments, TResult> {
	returnValue(value: TResult): this;
	returnValueOnce(value: TResult): this;
	returnValueNth(nth: number, value: TResult): this;
	returnValueSequence(sequence: TResult[]): this;

	resolvedValue(value: unknown): this;
	resolvedValueNth(nth: number, value: unknown): this;
	resolvedValueSequence(sequence: unknown[]): this;

	rejectedValue(value: unknown): this;
	rejectedValueNth(nth: number, value: unknown): this;
}
