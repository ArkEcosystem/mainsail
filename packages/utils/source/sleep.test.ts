import { describe } from "../../core-test-framework";

import { sleep } from "./sleep";

describe("#sleep", ({ it, assert }) => {
	it("should sleep for 1 second", async () => {
		const start: number = +new Date();

		await sleep(1000);

		const end: number = +new Date();

		assert.equal(Math.round((end - start) / 1000), 1);
	});
});
