import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { validatorSetPack } from "@mainsail/utils";

import { blockData, blockDataJson, blockHeaderStorage, serialized } from "../../crypto-block/test/fixtures/index.js";
import { assertBlockData } from "../../crypto-block/test/helpers/asserts.js";
import { assertCommitProofData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { CommitFactory } from "./factory";
import { Serializer } from "./serializer";

describe<{
	app: Application;
	factory: CommitFactory;
	serializer: Serializer;
	configuration: Contracts.Crypto.Configuration;
}>("Factory", ({ it, assert, beforeEach }) => {
	const signature =
		"97a16d3e938a1bc6866701b946e703cfa502d57a226e540f270c16585405378e93086dfb3b32ab2039aa2c197177c66b0fec074df5bfac037efd3dc41d98d50455a69ff1934d503ef69dffa08429f75e5677efca4f2de36d46f8258635e32a95";

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(
			Identifiers.Cryptography.Configuration,
		);
		context.configuration.setHeight(1);

		context.factory = context.app.resolve(CommitFactory);
		context.serializer = context.app.get<Serializer>(Identifiers.Cryptography.Commit.Serializer);
	});

	it("#fromBytes - should create commit from bytes", async ({ factory, serializer, configuration }) => {
		const { roundValidators } = configuration.getMilestone(blockData.number);
		const validators = Array.from<boolean>({ length: roundValidators }).fill(false);
		validators[0] = true;
		validators[2] = true;

		const proof = {
			round: 1,
			signature,
			validators,
		};

		const proofBytes = await serializer.serializeCommitProof(proof);
		const commitBytes = Buffer.concat([proofBytes, Buffer.from(serialized, "hex")]);

		const commit = await factory.fromBytes(commitBytes);

		assertCommitProofData(assert, commit.proof, proof);
		// assertBlockData(assert, commit.block, blockData);
		// assert.equal(commit.block.serialized, serialized);
		// assert.equal(commit.serialized, commitBytes.toString("hex"));
	});

	it("#fromJson - should create commit from json", async ({ factory, configuration }) => {
		const { roundValidators } = configuration.getMilestone(blockData.number);
		const validators = Array.from<boolean>({ length: roundValidators }).fill(true);

		const proof = {
			round: 1,
			signature,
			validators,
		};

		const commitJson: Contracts.Crypto.CommitJson = {
			block: blockDataJson,
			proof,
			serialized: "deadbeef",
		};

		const commit = await factory.fromJson(commitJson);

		assertBlockData(assert, commit.block, blockData);
		assertCommitProofData(assert, commit.proof, proof);
		assert.equal(commit.serialized, commitJson.serialized);
	});

	it("#fromStorage - should create commit from storage", async ({ factory, serializer, configuration }) => {
		const { roundValidators } = configuration.getMilestone(blockData.number);
		const validators = Array.from<boolean>({ length: roundValidators }).fill(false);
		validators[0] = true;

		const commitStorage: Contracts.Evm.CommitStorageData = {
			proof: {
				round: 1,
				signature,
				validatorSet: validatorSetPack(validators),
			},
			header: blockHeaderStorage,
			transactions: [],
		};

		const commit = await factory.fromStorage(commitStorage);

		assertCommitProofData(assert, commit.proof, { round: 1, signature, validators });
		assertBlockData(assert, commit.block, blockData);

		const expectedSerialized = await serializer.serializeCommit(commit);
		assert.equal(commit.serialized, expectedSerialized.toString("hex"));
	});
});
