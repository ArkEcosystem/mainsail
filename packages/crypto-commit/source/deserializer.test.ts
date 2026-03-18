import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { InvalidCommitProofBytesError } from "@mainsail/exceptions";
import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { commitProof1, commitProof2, commitProofSerialized1, commitProofSerialized2 } from "../test/fixtures/index.ts";

describe<{
	app: Application;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.get<Deserializer>(Identifiers.Cryptography.Commit.Deserializer);
	});

	it("#deserializeCommitProof - should deserialize commit proof", async ({ deserializer }) => {
		assert.equal(await deserializer.deserializeCommitProof(Buffer.from(commitProofSerialized1, "hex")), commitProof1);
		assert.equal(await deserializer.deserializeCommitProof(Buffer.from(commitProofSerialized2, "hex")), commitProof2);
	});


	it("#deserializeCommitProof - should throw with leading bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeCommitProof(Buffer.from(hex + commitProofSerialized1, "hex")),
				InvalidCommitProofBytesError,
			);
		}
	});

	it("#deserializeCommitProof - should throw with trailing bytes", async ({ deserializer }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(
				() => deserializer.deserializeCommitProof(Buffer.from(commitProofSerialized1 + hex, "hex")),
				InvalidCommitProofBytesError,
			);
		}
	});
});
