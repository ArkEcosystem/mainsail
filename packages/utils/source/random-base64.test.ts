import "jest-extended";

import { randomBase64 } from "./random-base64";

describe("#randomBase64", () => {
	it("should return a random base64 string", () => {
		expect(randomBase64(8)).toHaveLength(8);
		expect(randomBase64(16)).toHaveLength(16);
		expect(randomBase64(32)).toHaveLength(32);
	});
});
