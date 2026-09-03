import { describe } from "@mainsail/test-runner";

import * as index from "./index";
import { ServiceProvider } from "./service-provider";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.is(index.ServiceProvider, ServiceProvider);
	});
});
