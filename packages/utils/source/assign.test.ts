import { describe } from "../../test-framework/source";
import { assign } from "./assign";

class Foo {
	public a = 1;
}

class Bar {
	public c = 3;
}

describe("#assign", ({ it, assert }) => {
	it("should return the names of the users", () => {
		assert.equal(assign({ a: 0 }, new Foo(), new Bar()), { a: 1, c: 3 });
	});
});
