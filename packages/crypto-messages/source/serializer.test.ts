import { describe, Sandbox } from "../../test-framework/source";
import {
	prevoteData,
	precommitData,
	precommitDataNoBlock,
	prevoteDataNoBlock,
	serializedPrevote,
	serializedPrecommit,
	serializedPrecommitForSignature,
	serializedPrevoteForSignature,
	serializedPrevoteNoBlock,
	serializedPrecommitNoBlock,
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

	it("#serializeMessage - should correctly serialize prevote for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializeMessage - should correctly serialize precommit for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializeMessage - should correctly serialize prevote with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializeMessage - should correctly serialize precommit with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializeMessage - should correctly serialize prevote without block", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(prevoteDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlock);
	});

	it("#serializeMessage - should correctly serialize precommit without block", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(precommitDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlock);
	});
});
