import { SinonSpy, spy } from "sinon";

import { Fake } from "./fake";

export class Spy extends Fake<SinonSpy> {
	public constructor(target?: object, method?: string) {
		super();

		if (target && method) {
			this.subject = spy(target, method as never);
		} else {
			this.subject = spy();
		}
	}
}
