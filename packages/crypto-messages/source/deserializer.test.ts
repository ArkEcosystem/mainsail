import { describe, Sandbox } from "@mainsail/test-framework";

import {
	prevoteData,
	precommitData,
	serializedPrecommit,
	prevoteDataNoBlock,
	precommitDataNoBlock,
	serializedPrevote,
	serializedPrecommitNoBlock,
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

	it("#deserializeMessage - should correctly deserialize prevote", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevote, "hex"));
		assertPrecommit(assert, deserialized, prevoteData);
	});

	it("#deserializeMessage - should correctly deserialize precommit", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommit, "hex"));
		assertPrecommit(assert, deserialized, precommitData);
	});

	it("#deserializeMessage - should correctly deserialize prevote without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevoteNoBlock, "hex"));
		assertPrecommit(assert, deserialized, prevoteDataNoBlock);
	});

	it("#deserializeMessage - should correctly deserialize precommit without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommitNoBlock, "hex"));
		assertPrecommit(assert, deserialized, precommitDataNoBlock);
	});
});
