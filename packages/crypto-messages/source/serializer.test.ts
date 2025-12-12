import { describe, Sandbox } from "../../test-framework/source";
import {
	prevoteData,
	prevoteDataNoBlock,
	serializedPrevote,
	serializedPrevoteForSignature,
	serializedPrevoteNoBlock,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";

describe<{
	sandbox: Sandbox;
	serializer: Serializer;
	deserializer: Deserializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.sandbox.app.resolve(Serializer);
		context.deserializer = context.sandbox.app.resolve(Deserializer);
	});

	it("#serializeMessage - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializeMessage - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializeMessage - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(prevoteDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlock);
	});
});
