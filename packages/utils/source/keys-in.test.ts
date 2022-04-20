import { describe } from "../../core-test-framework";
import { keysIn } from "./keys-in";

describe("includeAllMembers", async ({ assert, it, nock, loader }) => {
	it("should work with an object", () => {
		function Foo() {
			this.a = 1;

			this.b = 2;
		}

		Foo.prototype.c = 3;

		assert.includeAllMembers(keysIn(new Foo()), ["a", "b", "c"]);
	});
});
