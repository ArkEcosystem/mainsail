import "jest-extended";

import { sleep } from "./sleep";

describe("#sleep", () => {
	it("should sleep for 1 second", async () => {
		const start: number = +new Date();

		await sleep(1000);

		const end: number = +new Date();

		expect(Math.round((end - start) / 1000)).toEqual(1);
	});
});
