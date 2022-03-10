import { SinonSpy } from "sinon";

import { Fake } from "./fake";

export class Spy extends Fake<SinonSpy> {
	public call<T>(): T {
		return this.subject();
	}

	public toFunction(): SinonSpy {
		return this.subject;
	}
}
