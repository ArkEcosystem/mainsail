import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
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
	serializedPrevoteNoBlockForSignature,
	serializedPrecommitNoBlockForSignature,
	signatureContext,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";

describe<{
	app: Application;
	serializer: Serializer;
	deserializer: Deserializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.app.resolve(Serializer);
		context.deserializer = context.app.resolve(Deserializer);
	});

	it("#serializeMessage - should correctly serialize prevote for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(prevoteData, signatureContext)).toString(
			"hex",
		);
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializeMessage - should correctly serialize precommit for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializeMessageForSignature(precommitData, signatureContext)).toString(
			"hex",
		);
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializeMessage - should correctly serialize prevote without block for signature", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeMessageForSignature(prevoteDataNoBlock, signatureContext)
		).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlockForSignature);
	});

	it("#serializeMessage - should correctly serialize precommit without block for signature", async ({
		serializer,
	}) => {
		const serialized = (
			await serializer.serializeMessageForSignature(precommitDataNoBlock, signatureContext)
		).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlockForSignature);
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

	it("#serializeMessageForSignature - different genesisBlockHash should produce different bytes (cross-chain isolation)", async ({
		serializer,
	}) => {
		const otherChainContext = {
			...signatureContext,
			genesisBlockHash: "00000000000000000000000000000000000000000000000000000000000000ff",
		};

		const a = (await serializer.serializeMessageForSignature(prevoteData, signatureContext)).toString("hex");
		const b = (await serializer.serializeMessageForSignature(prevoteData, otherChainContext)).toString("hex");

		assert.not.equal(a, b);
	});

	it("#serializeMessageForSignature - different previousBlockHash should produce different bytes (cross-fork isolation)", async ({
		serializer,
	}) => {
		const otherForkContext = {
			...signatureContext,
			previousBlockHash: "00000000000000000000000000000000000000000000000000000000000000ff",
		};

		const a = (await serializer.serializeMessageForSignature(prevoteData, signatureContext)).toString("hex");
		const b = (await serializer.serializeMessageForSignature(prevoteData, otherForkContext)).toString("hex");

		assert.not.equal(a, b);
	});

	it("#serializeMessageForSignature - different previousBlockHash should produce different bytes for NIL vote (cross-fork isolation for NIL)", async ({
		serializer,
	}) => {
		const otherForkContext = {
			...signatureContext,
			previousBlockHash: "00000000000000000000000000000000000000000000000000000000000000ff",
		};

		const a = (await serializer.serializeMessageForSignature(prevoteDataNoBlock, signatureContext)).toString("hex");
		const b = (await serializer.serializeMessageForSignature(prevoteDataNoBlock, otherForkContext)).toString("hex");

		assert.not.equal(a, b);
	});

	it("#serializeMessage - wire format must not depend on signing context", async ({ serializer }) => {
		const wire = (await serializer.serializeMessage(prevoteData)).toString("hex");
		assert.equal(wire, serializedPrevote);
		assert.false(wire.includes(signatureContext.genesisBlockHash));
		assert.false(wire.includes(signatureContext.previousBlockHash));
	});
});
