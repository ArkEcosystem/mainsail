import type { Contracts } from "@mainsail/contracts";
import { Identifiers, Enums } from "@mainsail/constants";

import crypto from "../../core/bin/config/devnet/core/crypto.json";
import { describe, Factories, Sandbox } from "../../test-framework/source";
import { Types } from "../../test-framework/source/factories";
import {
	prevoteData,
	prevoteDataNoBlock,
	serializedPrevote,
	serializedPrevoteNoBlock,
	validatorMnemonic,
} from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { toData } from "../test/helpers/utilities.js";
import { Factory } from "./factory";

describe<{
	sandbox: Sandbox;
	factory: Factory;
	blockFactory: Contracts.Crypto.BlockFactory;
	identity: Types.Identity;
}>("Factory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const wallet = {};
		const validatorSet = {
			getRoundValidators: () => [wallet],
		};

		const workerPool = {
			getWorker: () => {
				return {
					// @ts-ignore
					consensusSignature: (method, message, privateKey) =>
						context.sandbox.app
							.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
							[method](message, privateKey),
					// @ts-ignore
					transactionFactory: (method, message, privateKey) =>
						context.sandbox.app
							.get(Identifiers.Cryptography.Transaction.Factory)!
							[method](message, privateKey),
				};
			},
		};

		context.sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(validatorSet);
		context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

		context.factory = context.sandbox.app.resolve(Factory);
		context.blockFactory = context.sandbox.app.get<Contracts.Crypto.BlockFactory>(
			Identifiers.Cryptography.Block.Factory,
		);

		const identityFactory = await Factories.factory("Identity", crypto);
		const identity = await identityFactory
			.withOptions({
				app: context.sandbox.app,
				keyType: "consensus",
				passphrase: validatorMnemonic,
			})
			.make();

		context.identity = identity;
	});

	it("#makePrevote - should correctly make signed prevote", async ({ factory, identity }) => {
		const prevote = await factory.makeMessage(prevoteData, identity.keys);

		assert.equal(prevote.signature, prevoteData.signature);
	});

	it("#makeMessage - should correctly make signed prevote no block", async ({ factory, identity }) => {
		const prevote = await factory.makeMessage(
			{
				blockHash: undefined,
				blockNumber: 1,
				round: 1,
				type: Enums.Crypto.MessageType.Prevote,
				validatorIndex: 0,
			},
			identity.keys,
		);

		assert.equal(
			prevote.signature,
			"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
		);
	});

	it("#makeMessageFromBytes - should be ok", async ({ factory }) => {
		const prevote = await factory.makeMessageFromBytes(Buffer.from(serializedPrevote, "hex"));

		assert.equal(toData(prevote), prevoteData);
	});

	it("#makeMessageFromBytes - should be ok with no block", async ({ factory }) => {
		const prevote = await factory.makeMessageFromBytes(Buffer.from(serializedPrevoteNoBlock, "hex"));

		assert.equal(toData(prevote), prevoteDataNoBlock);
	});
});
