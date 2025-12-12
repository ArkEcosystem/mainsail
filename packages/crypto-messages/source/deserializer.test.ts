import { describe, Sandbox } from "../../test-framework/source";
import {
	prevoteData,
	prevoteDataNoBlock,
	serializedPrevote,
	serializedPrevoteNoBlock,
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

	it("#deserializeMessage - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevote, "hex"));
		assertPrecommit(assert, deserialized, prevoteData);
	});

	it("#deserializeMessage - should correctly deserialize without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevoteNoBlock, "hex"));
		assertPrecommit(assert, deserialized, prevoteDataNoBlock);
	});
});
