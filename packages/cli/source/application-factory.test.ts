import { Container } from "@mainsail/container";

import { describe } from "../../test-framework";
import { Application, ApplicationFactory, Identifiers, Utils } from "./index";

describe("ApplicationFactory", ({ it, stub, assert }) => {
	it("should create an application instance with the given container", () => {
		assert.instance(
			ApplicationFactory.make(new Container(), {
				description: "Core of the Mainsail Blockchain",
				name: "@mainsail/core",
				version: "3.0.0-next.0",
				bin: {
					mainsail: "./bin/run",
				},
			}),
			Application,
		);
	});

	it("should expose the ProcessFactory", () => {
		const app = ApplicationFactory.make(new Container(), {
			description: "Core of the Mainsail Blockchain",
			name: "@mainsail/core",
			version: "3.0.0-next.0",
			bin: {
				mainsail: "./bin/run",
			},
		});

		assert.instance(app.get<any>(Identifiers.ProcessFactory)("ark", "core"), Utils.Process);
	});
});
