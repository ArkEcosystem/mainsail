import { SinonStub, stub } from "sinon";
import { ok } from "uvu/assert";

export class Stub {
	private readonly subject: SinonStub;

	public constructor(target: object, method: string) {
		this.subject = stub(target, method as never);
	}

	public returnValue(value: unknown): Stub {
		this.subject.returns(value);

		return this;
	}

	public returnValueOnce(value: unknown): Stub {
		this.subject.onFirstCall().returns(value);

		return this;
	}

	public resolvedValue(value: unknown): Stub {
		this.subject.resolves(value);

		return this;
	}

	public callsFake(value: (...args: any[]) => any): Stub {
		this.subject.callsFake(value);

		return this;
	}

	public calledWith(message: string | object): void {
		ok(this.subject.calledWith(message));
	}

	public calledOnce(): void {
		this.calledTimes(1);
	}

	public neverCalled(): void {
		this.calledTimes(0);
	}

	public getCallArgs(index: number): any[] {
		if (this.subject.callCount > index) {
			return this.subject.getCall(index).args;
		}

		throw new Error(`Can't get args for call: ${index}`);
	}

	public restore(): void {
		this.subject.restore();
	}

	private calledTimes(times: number): void {
		ok(this.subject.callCount === times);
	}
}
