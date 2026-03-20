import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Serializer } from "./serializer";
import {
	commitProof1,
	commitProof2,
	commitProofSerialized1,
	commitProofSerialized2,
	commit,
	commitSerialized,
} from "../test/fixtures/index.ts";

describe<{
	app: Application;
	serializer: Serializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.app.get<Serializer>(Identifiers.Cryptography.Commit.Serializer);
	});

	it("#serialize - should serialize commit proof", async ({ serializer }) => {
		const serialized1 = await serializer.serializeCommitProof(commitProof1);
		const serialized2 = await serializer.serializeCommitProof(commitProof2);

		assert.equal(serialized1.toString("hex"), commitProofSerialized1);
		assert.equal(serialized2.toString("hex"), commitProofSerialized2);
	});

	it("#serialize - should serialize commit", async ({ serializer }) => {
		const serialized = await serializer.serializeCommit(commit);

		assert.equal(serialized.toString("hex"), commitSerialized);
	});
});
