import "jest-extended";

import { Application } from "@packages/core-kernel/source/application";
import { Container, Identifiers } from "@packages/core-kernel/source/ioc";
import { ServiceProvider } from "@packages/core-kernel/source/services/pipeline";
import { MemoryPipeline } from "@packages/core-kernel/source/services/pipeline/drivers/memory";
import { PipelineFactory } from "@packages/core-kernel/source/types";

let app: Application;

beforeEach(() => (app = new Application(new Container())));

describe("PipelineServiceProvider", () => {
	it("should register the service", async () => {
		expect(app.isBound(Identifiers.PipelineFactory)).toBeFalse();

		await app.resolve<ServiceProvider>(ServiceProvider).register();

		expect(app.isBound(Identifiers.PipelineFactory)).toBeTrue();
	});

	it("should create an instance of the MemoryPipeline", async () => {
		await app.resolve<ServiceProvider>(ServiceProvider).register();

		expect(app.get<PipelineFactory>(Identifiers.PipelineFactory)()).toBeInstanceOf(MemoryPipeline);
	});
});
