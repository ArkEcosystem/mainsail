export interface Fake {
	call<U>(...arguments_: any[]): U;
	called(): void;
	calledWith(...arguments_: any[]): void;
	notCalledWith(...arguments_: any[]): void;
	calledNthWith(index: number, ...arguments_: any[]): void;
	calledOnce(): void;
	calledTimes(times: number): void;
	neverCalled(): void;
	getCallArgs(index: number): any[];
	restore(): void;
	reset(): void;
}

export interface Stub extends Fake {
	returnValue(value: unknown): Stub;
	returnValueOnce(value: unknown): Stub;
	returnValueNth(nth: number, value: unknown): Stub;
	returnValueSequence(sequence: unknown[]): Stub;
	resolvedValue(value: unknown): Stub;
	resolvedValueNth(nth: number, value: unknown): Stub;
	resolvedValueSequence(sequence: unknown[]): Stub;
	rejectedValue(value: unknown): Stub;
	rejectedValueNth(nth: number, value: unknown): Stub;
}
