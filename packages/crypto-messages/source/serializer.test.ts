import { describe, Sandbox } from "../../test-framework/source";
import {
	precommitData,
	precommitDataNoBlock,
	serializedPrecommit,
	serializedPrecommitForSignature,
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

	it("#serializeMessage - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializeMessage - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializeMessage - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessage(precommitDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlock);
	});
});
