import { describe } from "./describe";
import { runHook } from "./hooks";

describe("hooks", ({ assert, it }) => {
	it("should run hook", async () => {
		let x = 1;

		await runHook(() => (x += 1))({});

		assert.equal(x, 2);
	});

	it("should bubble up error if hook throws", async () => {
		await assert.rejects(
			async () =>
				runHook(() => {
					throw new Error("hook died");
				})({}),
			"hook died",
		);
	});
});
