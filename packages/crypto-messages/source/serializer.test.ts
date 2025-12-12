import { describe, Sandbox } from "../../test-framework/source";
import {
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	serializedPrecommit,
	serializedPrecommitForSignature,
	serializedPrecommitNoBlock,
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

	it("#serializePrecommit - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommitForSignature(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializePrecommit - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializePrecommit - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlock);
	});

	it("#serializePrevote - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevoteForSignature(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializePrevote - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializePrevote - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlock);
	});
});
