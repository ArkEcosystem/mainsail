import { Container, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/core-contracts";

import { describe } from "../../../../../core-test-framework";
import { Application } from "../../../application";
import { MemoryPipeline } from "./memory";

describe<{
	app: Application;
	pipeline: Contracts.Kernel.Pipeline;
}>("Pipeline", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.pipeline = new MemoryPipeline();
	});

	it("should apply all stages (async)", async (context) => {
		class RemoveDash implements Contracts.Kernel.Stage {
			async process(payload: string) {
				return payload.replace("_", "");
			}
		}

		class RemoveUnderscore implements Contracts.Kernel.Stage {
			async process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual: string = await context.pipeline
			.pipe(new RemoveDash())
			.pipe(new RemoveUnderscore())
			.process("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (sync)", (context) => {
		class RemoveDash implements Contracts.Kernel.Stage {
			process(payload: string) {
				return payload.replace("_", "");
			}
		}

		class RemoveUnderscore implements Contracts.Kernel.Stage {
			process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual: string = context.pipeline
			.pipe(new RemoveDash())
			.pipe(new RemoveUnderscore())
			.processSync("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (async)", async (context) => {
		@injectable()
		class RemoveDash implements Contracts.Kernel.Stage {
			async process(payload: string) {
				return payload.replace("_", "");
			}
		}

		@injectable()
		class RemoveUnderscore implements Contracts.Kernel.Stage {
			async process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual: string = await context.pipeline
			.pipe(context.app.resolve(RemoveDash))
			.pipe(context.app.resolve(RemoveUnderscore))
			.process("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (sync)", (context) => {
		@injectable()
		class RemoveDash implements Contracts.Kernel.Stage {
			process(payload: string) {
				return payload.replace("_", "");
			}
		}

		@injectable()
		class RemoveUnderscore implements Contracts.Kernel.Stage {
			process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual: string = context.pipeline
			.pipe(context.app.resolve(RemoveDash))
			.pipe(context.app.resolve(RemoveUnderscore))
			.processSync("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (async)", async (context) => {
		const removeDash = async (payload: string) => payload.replace("_", "");
		const removeUnderscore = async (payload: string) => payload.replace("-", " ");

		const actual: string = await context.pipeline.pipe(removeDash).pipe(removeUnderscore).process("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (sync)", (context) => {
		const removeDash = (payload: string) => payload.replace("_", "");
		const removeUnderscore = (payload: string) => payload.replace("-", " ");

		const actual: string = context.pipeline.pipe(removeDash).pipe(removeUnderscore).processSync("_Hello-World");

		assert.is(actual, "Hello World");
	});
});
