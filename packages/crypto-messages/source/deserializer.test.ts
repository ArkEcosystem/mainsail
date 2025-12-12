import { describe, Sandbox } from "../../test-framework/source";
import {
	precommitData,
	precommitDataNoBlock,
	serializedPrecommit,
	serializedPrecommitNoBlock,
} from "../test/fixtures/index.js";
import { assertPrecommit } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";

describe<{
	sandbox: Sandbox;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.sandbox.app.resolve(Deserializer);
	});

	it("#deserializePrecommit - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommit, "hex"));
		assertPrecommit(assert, deserialized, precommitData);
	});

	it("#deserializePrecommit - should correctly deserialize without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommitNoBlock, "hex"));
		assertPrecommit(assert, deserialized, precommitDataNoBlock);
	});
});
