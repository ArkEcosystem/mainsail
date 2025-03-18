import { assign } from "../distribution/assign.js";
import lodashAssign from "lodash/assign.js";

function Foo() {
	this.a = 1;
}

function Bar() {
	this.c = 3;
}

Foo.prototype.b = 2;
Bar.prototype.d = 4;

export const utils = () =>
	assign(
		{
			a: 0,
		},
		new Foo(),
		new Bar(),
	);

export const lodash = () =>
	lodashAssign(
		{
			a: 0,
		},
		new Foo(),
		new Bar(),
	);
