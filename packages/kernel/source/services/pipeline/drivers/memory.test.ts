import { Container, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { describe } from "../../../../../test-framework/source";
import { Application } from "../../../application";
import { MemoryPipeline } from "./memory";

describe<{
	app: Application;
	pipeline: Contracts.Kernel.Pipeline<string>;
}>("Pipeline", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.pipeline = new MemoryPipeline<string>();
	});

	it("should apply all stages (async)", async (context) => {
		class RemoveDash implements Contracts.Kernel.Stage<string> {
			async process(payload: string): Promise<string> {
				return payload.replace("_", "");
			}
		}

		class RemoveUnderscore implements Contracts.Kernel.Stage<string> {
			async process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual = await context.pipeline
			.pipe(new RemoveDash())
			.pipe(new RemoveUnderscore())
			.process("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (async)", async (context) => {
		@injectable()
		class RemoveDash implements Contracts.Kernel.Stage<string> {
			async process(payload: string) {
				return payload.replace("_", "");
			}
		}

		@injectable()
		class RemoveUnderscore implements Contracts.Kernel.Stage<string> {
			async process(payload: string) {
				return payload.replace("-", " ");
			}
		}

		const actual = await context.pipeline
			.pipe(context.app.resolve(RemoveDash))
			.pipe(context.app.resolve(RemoveUnderscore))
			.process("_Hello-World");

		assert.is(actual, "Hello World");
	});

	it("should apply all stages (async)", async (context) => {
		const removeDash = async (payload: string) => payload.replace("_", "");
		const removeUnderscore = async (payload: string) => payload.replace("-", " ");

		const actual = await context.pipeline.pipe(removeDash).pipe(removeUnderscore).process("_Hello-World");

		assert.is(actual, "Hello World");
	});
});
