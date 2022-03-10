import assert from "uvu/assert";

export abstract class Fake<T> {
	protected readonly subject: any;

	public constructor(subject: T) {
		this.subject = subject;
	}

	public called(): void {
		assert.ok(this.subject.called);
	}

	public calledWith(...arguments_: any[]): void {
		assert.ok(this.subject.calledWith(...arguments_));
	}

	public notCalledWith(...arguments_: any[]): void {
		assert.not.ok(this.subject.calledWith(...arguments_));
	}

	public calledNthWith(index: number, ...arguments_: any[]): void {
		if (this.subject.callCount <= index) {
			throw new Error(`Failed to get arguments for call#${index}`);
		}

		assert.ok(this.subject.getCall(index).calledWith(...arguments_));
	}

	public calledOnce(): void {
		this.calledTimes(1);
	}

	public calledTimes(times: number): void {
		assert.ok(this.subject.callCount === times);
	}

	public neverCalled(): void {
		this.calledTimes(0);
	}

	public getCallArgs(index: number): any[] {
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
}
