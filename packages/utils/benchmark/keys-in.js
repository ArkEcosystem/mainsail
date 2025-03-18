import { keysIn } from "../distribution/keys-in.js";
import lodashKeysIn from "lodash/keysIn.js";

function Foo() {
	this.a = 1;
	this.b = 2;
}

Foo.prototype.c = 3;

export const utils = () => keysIn(new Foo());
export const lodash = () => lodashKeysIn(new Foo());
