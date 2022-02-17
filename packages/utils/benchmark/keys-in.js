const { keysIn } = require("../dist");
const lodash = require("lodash/keysIn");

function Foo() {
	this.a = 1;
	this.b = 2;
}

Foo.prototype.c = 3;

exports["utils"] = () => keysIn(new Foo());

exports["lodash"] = () => lodash(new Foo());
