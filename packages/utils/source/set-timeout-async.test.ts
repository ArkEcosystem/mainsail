import { describe } from "@mainsail/test-runner";
import { setTimeoutAsync } from "./set-timeout-async";

describe("setTimeoutAsync", async ({ assert, it }) => {
	it("should be ok", async () => {
		const events: string[] = [];

		const done = new Promise<void>((resolve) => {
			const timeout = setTimeoutAsync(async () => {
				events.push("callback");
				await Promise.resolve();
				resolve();
			}, 100);
		});

		events.push("after-call");

		await done;

		assert.equal(events, ["after-call", "callback"]);
	});
});
