const { assign } = require("../dist");
const lodash = require("lodash/assign");

function Foo() {
	this.a = 1;
}

function Bar() {
	this.c = 3;
}

Foo.prototype.b = 2;
Bar.prototype.d = 4;

exports["utils"] = () =>
	assign(
		{
			a: 0,
		},
		new Foo(),
		new Bar(),
	);

exports["lodash"] = () =>
	lodash(
		{
			a: 0,
		},
		new Foo(),
		new Bar(),
	);
