import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { prepareSandbox, assertBlockData } from "../test/helpers/index.ts";
import { CommitFactory } from "./factory";
import { commitSerialized, blockSerialized, commitProof1, blockData, blockDataJson, blockHeaderStorage } from "../test/fixtures/index.ts";
import { validatorSetPack } from "@mainsail/utils";

describe<{
	app: Application;
	factory: CommitFactory;
	configuration: Contracts.Crypto.Configuration;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(
			Identifiers.Cryptography.Configuration,
		);
		context.configuration.setHeight(1);

		context.factory = context.app.resolve(CommitFactory);
	});

	it("#fromBytes - should create commit from bytes", async ({ factory }) => {
		const commit = await factory.fromBytes(Buffer.from(commitSerialized, "hex"));

		assert.equal(commit.proof, commitProof1);
		assertBlockData(assert, commit.block, blockData);
		assert.equal(commit.block.serialized, blockSerialized);
		assert.equal(commit.serialized, commitSerialized);
	});

	it("#fromJson - should create commit from json", async ({ factory, configuration }) => {
		const commitJson: Contracts.Crypto.CommitJson = {
			block: blockDataJson,
			proof: commitProof1,
			serialized: commitSerialized,
		};

		const commit = await factory.fromJson(commitJson);

		assertBlockData(assert, commit.block, blockData);
		assert.equal(commit.proof, commitProof1);
		assert.equal(commit.serialized, commitSerialized);
	});

	it("#fromStorage - should create commit from storage", async ({ factory,  }) => {
		const commitStorage: Contracts.Evm.CommitStorageData = {
			proof: {
				round: commitProof1.round,
				signature: commitProof1.signature,
				validatorSet: validatorSetPack(commitProof1.validators),
			},
			header: blockHeaderStorage,
			transactions: [],
		};

		const commit = await factory.fromStorage(commitStorage);

		console.log(commit);

		assert.equal(commit.proof, commitProof1);
		assert.equal(commit.block.transactions, []);
		assertBlockData(assert, commit.block, blockData);

		// TODO: Check
		// assert.equal(commit.block.serialized, blockSerialized);
		// const expectedSerialized = await serializer.serializeCommit(commit);
		// assert.equal(commit.serialized, commitSerialized);
	});
});
