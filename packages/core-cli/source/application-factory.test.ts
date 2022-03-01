import { describe } from "../../core-test-framework";
import { Application, ApplicationFactory, Container, Utils } from "./index";

describe("ApplicationFactory", ({ it, stub, assert }) => {
	it("should create an application instance with the given container", () => {
		assert.instance(
			ApplicationFactory.make(new Container.Container(), {
				description: "Core of the ARK Blockchain",
				name: "@arkecosystem/core",
				version: "3.0.0-next.0",
			}),
			Application,
		);
	});

	it("should expose the ProcessFactory", () => {
		const app = ApplicationFactory.make(new Container.Container(), {
			description: "Core of the ARK Blockchain",
			name: "@arkecosystem/core",
			version: "3.0.0-next.0",
		});

		assert.instance(app.get<any>(Container.Identifiers.ProcessFactory)("ark", "core"), Utils.Process);
	});
});
