import { keys } from "../distribution/keys.js";
import lodashKeys from "lodash/keys.js";

function Foo() {
	this.a = 1;
	this.b = 2;
}

Foo.prototype.c = 3;

export const utils = () => keys(new Foo());
export const lodash = () => lodashKeys(new Foo());
