import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { RegisterErrorHandler } from "./register-error-handler";

describe<{
	app: Application;
	handler: RegisterErrorHandler;
}>("RegisterErrorHandler", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.handler = context.app.resolve(RegisterErrorHandler);
	});

	it("should bootstrap", async ({ handler }) => {
		await assert.resolves(() => handler.bootstrap());
	});
});
