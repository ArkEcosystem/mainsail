import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
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
import { assertMessage } from "../test/helpers/asserts.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";

describe<{
	app: Application;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.resolve(Deserializer);
	});

	it("#deserializeMessage - should correctly deserialize prevote", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevote, "hex"));
		assertMessage(assert, deserialized, prevoteData);
	});

	it("#deserializeMessage - should correctly deserialize precommit", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommit, "hex"));
		assertMessage(assert, deserialized, precommitData);
	});

	it("#deserializeMessage - should correctly deserialize prevote without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrevoteNoBlock, "hex"));
		assertMessage(assert, deserialized, prevoteDataNoBlock);
	});

	it("#deserializeMessage - should correctly deserialize precommit without block", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeMessage(Buffer.from(serializedPrecommitNoBlock, "hex"));
		assertMessage(assert, deserialized, precommitDataNoBlock);
	});

	it("#deserializeMessage - should throw with extra bytes", async ({ deserializer }) => {
		await assert.rejects(() => deserializer.deserializeMessage(Buffer.from(serializedPrecommitNoBlock + "00", "hex")), "Message deserialization failed: 1 bytes remaining");
	});

	it("#deserializeMessage - should throw with missing bytes", async ({ deserializer }) => {
		await assert.rejects(() => deserializer.deserializeMessage(Buffer.from(serializedPrecommitNoBlock.slice(0, -2), "hex")), "Message deserialization failed: Read over buffer boundary.");
	});
});
