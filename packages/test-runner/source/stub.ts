import type { SinonStub } from "sinon";

import type { Stub as IStub } from "./contracts.js";
import type { FakeLike } from "./fake.js";
import { Fake } from "./fake.js";

type SinonStubLike<TArguments extends unknown[], TResult> = FakeLike<TArguments, TResult> &
	SinonStub & {
		returns(value: TResult): SinonStubLike<TArguments, TResult>;
		onCall(nth: number): SinonStubLike<TArguments, TResult>;
		resolves(value: unknown): SinonStubLike<TArguments, TResult>;
		rejects(value: unknown): SinonStubLike<TArguments, TResult>;
	};

export class Stub<TArguments extends unknown[] = unknown[], TResult = unknown>
	extends Fake<TArguments, TResult>
	implements IStub<TArguments, TResult>
{
	protected override readonly subject: SinonStubLike<TArguments, TResult>;

	public constructor(subject: SinonStubLike<TArguments, TResult>) {
		super(subject);
		this.subject = subject;
	}

	public returnValue(value: TResult): this {
		this.subject.returns(value);

		return this;
	}
	public returnValueOnce(value: TResult): this {
		this.subject.onFirstCall().returns(value);

		return this;
	}

	public returnValueNth(nth: number, value: TResult): this {
		this.subject.onCall(nth).returns(value);

		return this;
	}

	public returnValueSequence(sequence: TResult[]): this {
		for (const [nth, value] of sequence.entries()) {
			this.returnValueNth(nth, value);
		}

		return this;
	}

	public resolvedValue(value: unknown): this {
		this.subject.resolves(value);

		return this;
	}

	public resolvedValueNth(nth: number, value: TResult): this {
		this.subject.onCall(nth).resolves(value);

		return this;
	}

	public resolvedValueSequence(sequence: TResult[]): this {
		for (const [nth, value] of sequence.entries()) {
			this.resolvedValueNth(nth, value);
		}

		return this;
	}

	public rejectedValue(value: unknown): this {
		this.subject.rejects(value);

		return this;
	}

	public rejectedValueNth(nth: number, value: unknown): this {
		this.subject.onCall(nth).rejects(value);

		return this;
	}

	public rejectedValueSequence(sequence: unknown[]): this {
		for (const [nth, value] of sequence.entries()) {
			this.rejectedValueNth(nth, value);
		}

		return this;
	}

	public callsFake(value: (...arguments_: unknown[]) => unknown): this {
		this.subject.callsFake(value);

		return this;
	}

	public callsFakeNth(nth: number, value: (...arguments_: unknown[]) => unknown): this {
		this.subject.onCall(nth).callsFake(value);

		return this;
	}
}
