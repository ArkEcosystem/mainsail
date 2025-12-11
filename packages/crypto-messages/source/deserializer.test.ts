import { describe, Sandbox } from "../../test-framework/source";
import {
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	serializedPrecommit,
	serializedPrecommitNoBlock,
	serializedPrevote,
	serializedPrevoteNoBlock,
} from "../test/fixtures/index.js";
import { assertPrecommit, assertPrevote } from "../test/helpers/asserts";
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
		const deserialized = await deserializer.deserializePrecommit(Buffer.from(serializedPrecommit, "hex"));
		assertPrecommit(assert, deserialized, precommitData);
	});

	it("#deserializePrecommit - should correctly deserialize without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializePrecommit(Buffer.from(serializedPrecommitNoBlock, "hex"));
		assertPrecommit(assert, deserialized, precommitDataNoBlock);
	});

	it("#deserializePrevote - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializePrevote(Buffer.from(serializedPrevote, "hex"));
		assertPrevote(assert, deserialized, prevoteData);
	});

	it("#deserializePrevote - should correctly deserialize without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializePrevote(Buffer.from(serializedPrevoteNoBlock, "hex"));
		assertPrevote(assert, deserialized, prevoteDataNoBlock);
	});
});
