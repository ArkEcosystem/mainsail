import type { Contracts } from "@mainsail/contracts";
import { Identifiers, Enums } from "@mainsail/constants";

import { MessageSchemaError } from "@mainsail/exceptions";
import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Factories } from "../../test-factories/source/index.js";
import { Types } from "../../test-factories/source/factories";
import {
	prevoteData,
	precommitData,
	prevoteDataNoBlock,
	serializedPrevote,
	serializedPrecommit,
	serializedPrevoteNoBlock,
	serializedPrecommitNoBlock,
	precommitDataNoBlock,
	signatureContext,
	validatorMnemonic,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Factory } from "./factory";

describe<{
	app: Application;
	factory: Factory;
	blockFactory: Contracts.Crypto.BlockFactory;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1); // Required by schema to set number for validators

		const wallet = {};
		const validatorSet = {
			getRoundValidators: () => [wallet],
		};

		const workerPool = {
			getWorker: () => {
				return {
					// @ts-ignore
					consensusSignature: (method, message, privateKey) =>
						context.app
							.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
							[method](message, privateKey),
					// @ts-ignore
					transactionFactory: (method, message, privateKey) =>
						context.app.get(Identifiers.Cryptography.Transaction.Factory)![method](message, privateKey),
				};
			},
		};

		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		context.factory = context.app.resolve(Factory);
		context.blockFactory = context.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory);

		const identityFactory = await Factories.factory<Factories.Types.Identity>("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.app,
				keyType: "consensus",
				passphrase: validatorMnemonic,
			})
			.make();

		context.identity = identity;
	});

	it("#makeMessage - should correctly make signed prevote", async ({ factory, identity }) => {
		const message = await factory.makeMessage(prevoteData, identity.keys, signatureContext);

		assert.equal(message.signature, prevoteData.signature);
	});

	it("#makeMessage - should correctly make signed precommit", async ({ factory, identity }) => {
		const message = await factory.makeMessage(precommitData, identity.keys, signatureContext);

		assert.equal(message.signature, precommitData.signature);
	});

	it("#makeMessage - should correctly make signed prevote no block", async ({ factory, identity }) => {
		const message = await factory.makeMessage(
			{
				blockHash: undefined,
				blockNumber: 1,
				round: 1,
				type: Enums.Crypto.MessageType.Prevote,
				validatorIndex: 0,
			},
			identity.keys,
			signatureContext,
		);

		assert.equal(message.signature, prevoteDataNoBlock.signature);
	});

	it("#makeMessage - should correctly make signed precommit no block", async ({ factory, identity }) => {
		const message = await factory.makeMessage(
			{
				blockHash: undefined,
				blockNumber: 1,
				round: 1,
				type: Enums.Crypto.MessageType.Precommit,
				validatorIndex: 0,
			},
			identity.keys,
			signatureContext,
		);

		assert.equal(message.signature, precommitDataNoBlock.signature);
	});

	it("#makeMessage - should throw if schema is invalid", async ({ factory, identity }) => {
		const invalidPrecommitData = {
			...precommitData,
			blockNumber: 0, // invalid block number
		};

		await assert.rejects(
			() => factory.makeMessage(invalidPrecommitData, identity.keys, signatureContext),
			MessageSchemaError,
		);
	});

	it("#makeMessageFromBytes - should be ok for prevote", async ({ factory }) => {
		const prevote = await factory.makeMessageFromBytes(Buffer.from(serializedPrevote, "hex"));

		assert.equal(prevote.toData(), prevoteData);
	});

	it("#makeMessageFromBytes - should be ok for precommit", async ({ factory }) => {
		const precommit = await factory.makeMessageFromBytes(Buffer.from(serializedPrecommit, "hex"));

		assert.equal(precommit.toData(), precommitData);
	});

	it("#makeMessageFromBytes - should be ok for prevote with no block", async ({ factory }) => {
		const prevote = await factory.makeMessageFromBytes(Buffer.from(serializedPrevoteNoBlock, "hex"));

		assert.equal(prevote.toData(), prevoteDataNoBlock);
	});

	it("#makeMessageFromBytes - should be ok for precommit with no block", async ({ factory }) => {
		const precommit = await factory.makeMessageFromBytes(Buffer.from(serializedPrecommitNoBlock, "hex"));

		assert.equal(precommit.toData(), precommitDataNoBlock);
	});

	it("#makeMessageFromBytes - should throw if extra bytes are present", async ({ factory }) => {
		await assert.rejects(
			() => factory.makeMessageFromBytes(Buffer.from(serializedPrecommitNoBlock + "00", "hex")),
			"Message deserialization failed: 1 bytes remaining",
		);
	});

	it("#makeMessageFromBytes - should throw if missing bytes are present", async ({ factory }) => {
		await assert.rejects(
			() => factory.makeMessageFromBytes(Buffer.from(serializedPrecommitNoBlock.slice(0, -2), "hex")),
			"Message deserialization failed: Read over buffer boundary.",
		);
	});

	it("#makeMessageFromBytes - should throw if the deserialized type is out of range", async ({ factory }) => {
		// Structurally valid bytes, but the type byte (index 0) is neither Prevote(1) nor Precommit(2).
		// The deserializer reads it as a raw uint8; only the schema rejects it.
		const bytes = Buffer.from(serializedPrevote, "hex");
		bytes[0] = 3;

		await assert.rejects(() => factory.makeMessageFromBytes(bytes), MessageSchemaError);
	});

	it("#makeMessageFromBytes - should throw if validatorIndex exceeds roundValidators", async ({ factory }) => {
		// validatorIndex byte is at index 42 (type[1] + blockNumber[4] + round[4] + presence[1] + blockHash[32]).
		// roundValidators is 53 at blockNumber 1, so index 53 is out of range.
		const bytes = Buffer.from(serializedPrevote, "hex");
		bytes[42] = 53;

		await assert.rejects(() => factory.makeMessageFromBytes(bytes), MessageSchemaError);
	});
});
