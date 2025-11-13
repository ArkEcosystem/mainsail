import type { SinonSpy } from "sinon";

import type { Fake as IFake } from "./contracts.js";
import { Fake } from "./fake.js";

export class Spy extends Fake<SinonSpy> implements IFake {
	//
}
