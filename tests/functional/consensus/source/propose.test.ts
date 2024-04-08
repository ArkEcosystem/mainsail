import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Proposal } from "@mainsail/crypto-messages";
import { Transfers } from "@mainsail/test-transaction-builders";
import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getValidators,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeForRound,
} from "./utils.js";
import { BigNumber, keyBy } from "@mainsail/utils";
import { Utils } from "@mainsail/kernel";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Propose", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidators(context.nodes[0], validators);

		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("#single propose - should forge 3 blocks with all validators signing", async ({ nodes, validators }) => {
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 3);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);
	});

	it("#missing propose - should not accept block", async ({ nodes }) => {
		const node0 = nodes[0];
		const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");

		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#missing propose - should not accept block for 3 rounds", async ({ nodes }) => {
		const rounds = 3;
		const node0 = nodes[0];
		const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");

		stubPropose.callsFake(async () => {});

		await snoozeForRound(nodes, rounds);
		stubPropose.restore();

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, rounds + 1); // +1 for accepted block
		await assertBlockId(nodes);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#invalid proposer - should not accept block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");

		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(nodes[1], validators[1], 1, 0);
		await p2p.broadcastProposal(proposal0);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#double propose - one by one - should take the first proposal", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		await p2p.broadcastProposal(proposal0);
		await p2p.broadcastProposal(proposal1);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes, proposal0.block.block.data.id);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
			],
		);

		// Assert all nodes precommit
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			Array.from({ length: totalNodes }).fill(proposal0.block.block.data.id),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#double propose - 50 : 50 split - should not accept block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		await p2p.broadcastProposal(proposal0, [0, 1, 2]);
		await p2p.broadcastProposal(proposal1, [3, 4]);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
				proposal1.block.block.data.id,
			],
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#double propose - 50 : 50 split - should not accept block for 3 rounds", async ({ nodes, validators, p2p }) => {
		const rounds = 3;

		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {});

		for (let round = 0; round < rounds; round++) {
			const proposal0 = await makeProposal(node0, validators[0], 1, round);
			const proposal1 = await makeProposal(node0, validators[0], 1, round);

			await p2p.broadcastProposal(proposal0, [0, 1, 2]);
			await p2p.broadcastProposal(proposal1, [3, 4]);

			await snoozeForRound(nodes, round);

			assert.equal(p2p.proposals.getMessages(1, round).length, 2); // Assert number of proposals
			assert.equal(p2p.prevotes.getMessages(1, round).length, totalNodes); // Assert number of prevotes
			assert.equal(p2p.precommits.getMessages(1, round).length, totalNodes); // Assert number of precommits

			// Assert all nodes prevote
			assert.equal(
				p2p.prevotes.getMessages(1, round).map((prevote) => prevote.blockId),
				[
					proposal0.block.block.data.id,
					proposal0.block.block.data.id,
					proposal0.block.block.data.id,
					proposal1.block.block.data.id,
					proposal1.block.block.data.id,
				],
			);

			// Assert all nodes precommit (null)
			assert.equal(
				p2p.precommits.getMessages(1, round).map((precommit) => precommit.blockId),
				Array.from({ length: totalNodes }).fill(undefined),
			);
		}

		stubPropose.restore();
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, rounds + 1); // +1 for accepted block
		await assertBlockId(nodes);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#double propose - majority : minority split - should  accept block broadcasted to majority", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);

		await p2p.broadcastProposal(proposal0, [0, 1, 2, 3]);
		await p2p.broadcastProposal(proposal1, [4]);

		const nodesSubset = nodes.slice(0, 4);
		await snoozeForBlock(nodesSubset);

		await assertBockHeight(nodesSubset, 1);
		await assertBockRound(nodesSubset, 0);
		await assertBlockId(nodesSubset);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
			],
		);

		// // Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			Array.from({ length: totalNodes - 1 }).fill(proposal0.block.block.data.id),
		);

		// Download blocks
		await p2p.postCommit(nodes[4].app, await getLastCommit(nodes[0]));
		await snoozeForBlock([nodes[4]], 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	it("#multi propose - propose per node - should not accept block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPropose = stub(nodes[0].app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);
		const proposal2 = await makeProposal(node0, validators[0], 1, 0);
		const proposal3 = await makeProposal(node0, validators[0], 1, 0);
		const proposal4 = await makeProposal(node0, validators[0], 1, 0);

		await p2p.broadcastProposal(proposal0, [0]);
		await p2p.broadcastProposal(proposal1, [1]);
		await p2p.broadcastProposal(proposal2, [2]);
		await p2p.broadcastProposal(proposal3, [3]);
		await p2p.broadcastProposal(proposal4, [4]);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 5); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
				proposal2.block.block.data.id,
				proposal3.block.block.data.id,
				proposal4.block.block.data.id,
			],
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockId),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// // Next block
		await snoozeForBlock(nodes, 2);
		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
	});

	// Produces:
	//
	// [2024-04-08 18:04:29.843](1)[ERROR] Cannot process block because: Insufficient balance in the wallet. +7ms
	// [2024-04-08 18:04:29.843](1)[INFO] Received proposal 1/0 blockId: 55e974d6f39bdfd8f1feeb3f165e537f5291b56a057fff57a707c8d65d786f97 +0ms
	// [2024-04-08 18:04:29.849](2)[ERROR] Cannot process block because: Insufficient balance in the wallet. +12ms
	// [2024-04-08 18:04:29.849](2)[INFO] Received proposal 1/0 blockId: 55e974d6f39bdfd8f1feeb3f165e537f5291b56a057fff57a707c8d65d786f97 +0ms
	// [2024-04-08 18:04:29.855](3)[ERROR] Cannot process block because: Insufficient balance in the wallet. +18ms
	// [2024-04-08 18:04:29.855](3)[INFO] Received proposal 1/0 blockId: 55e974d6f39bdfd8f1feeb3f165e537f5291b56a057fff57a707c8d65d786f97 +0ms
	// [2024-04-08 18:04:29.862](4)[ERROR] Cannot process block because: Insufficient balance in the wallet. +25ms
	// [2024-04-08 18:04:29.862](4)[INFO] Received proposal 1/0 blockId: 55e974d6f39bdfd8f1feeb3f165e537f5291b56a057fff57a707c8d65d786f97 +0ms
	it.only("#invalid propose - validators should reject block with invalid transactions", async ({
		nodes,
		validators,
	}) => {
		const makeTransactionBuilderContext = (node: Sandbox, validators: Validator[]) => {
			const context = {
				sandbox: node,
				wallets: validators.map((v) => ({
					publicKey: v.publicKey,
					privateKey: v.privateKey,
					compressed: false,
				})),
			};

			return {
				...context,
				fundedWalletProvider: async (
					context: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
					amount?: BigNumber,
				): Promise<Contracts.Crypto.KeyPair> => {
					// create a random wallet with funds (without sending a transaction)
					const { sandbox, wallets } = context;
					const { app } = sandbox;

					const seed = Date.now().toString();

					const randomKeyPair = await app
						.getTagged<Contracts.Crypto.KeyPairFactory>(
							Identifiers.Cryptography.Identity.KeyPair.Factory,
							"type",
							"wallet",
						)
						.fromMnemonic(seed);

					const recipient = await app
						.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
						.fromPublicKey(randomKeyPair.publicKey);

					amount = amount ?? BigNumber.make("10000000000");

					const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
					const wallet = walletRepository.findByAddress(recipient);
					wallet.setBalance(amount);

					console.log("random funded wallet", recipient, randomKeyPair.publicKey);

					return randomKeyPair;
				},
			};
		};

		const node0 = nodes[0];
		const proposer = node0.app
			.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository)
			.getValidator(validators[0].consensusPublicKey)!;

		// To create blocks containing arbitrary transactions, the transactions have to be added
		// in serialized form as the serializer would just fail e.g. due to malformed bytes etc.
		//
		// That's why the steps are as follows:
		//
		// 1) prepare (invalid) transactions in serialized form
		// 2) create empty serialized block
		// 3) concat with serialized transactions buffer
		// 4) manually make & sign proposal
		//
		// 1-3) represents 'proposer.prepareBlock'
		// 4) represents 'messageFactory.makeProposal'

		const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
		stubPropose.callsFake(async () => {
			// 1)
			const context = makeTransactionBuilderContext(node0, validators);
			const tx = await Transfers.makeTransferInsufficientBalance(context);

			// 2)
			const round = node0.app.get<Consensus>(Identifiers.Consensus.Service).getRound();
			const emptyBlock = await proposer.prepareBlock(validators[0].publicKey, round);

			// 3)
			console.log(tx.serialized.toString("hex"));
			// update block buffer
			// - payloadHash
			// - payloadLength
			// - transactions
			// - amount + fee
			let blockBuffer = Buffer.from(emptyBlock.serialized, "hex");
			console.log("orig", blockBuffer.toString("hex"));

			const totals: { amount: BigNumber; fee: BigNumber } = {
				amount: BigNumber.ZERO,
				fee: BigNumber.ZERO,
			};

			const transactions = [tx];
			const payloadBuffers: Buffer[] = [];
			const transactionBuffers: Buffer[] = [];

			let payloadLength = transactions.length * 4;
			for (const { data, serialized } of transactions) {
				Utils.assert.defined<string>(data.id);

				totals.amount = totals.amount.plus(data.amount);
				totals.fee = totals.fee.plus(data.fee);

				payloadBuffers.push(Buffer.from(data.id, "hex"));

				const buffer = Buffer.alloc(serialized.byteLength + 2);
				buffer.writeUint16LE(serialized.byteLength, 0);
				buffer.fill(serialized, 2, serialized.byteLength + 2);
				transactionBuffers.push(buffer);

				payloadLength += serialized.length;
			}

			const hashFactory = node0.app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
			const hashSize = node0.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);

			// numberOfTransactions
			let byteOffset = 1 + 6 + 4 + 4 + hashSize; // see headerSize
			blockBuffer.writeUint16LE(transactions.length, byteOffset);
			byteOffset += 2;

			// totalAmount
			blockBuffer.writeBigUInt64LE(totals.amount.toBigInt(), byteOffset);
			byteOffset += 8;

			// totalFee
			blockBuffer.writeBigUInt64LE(totals.fee.toBigInt(), byteOffset);
			byteOffset += 8;

			// skip reward
			byteOffset += 8;

			// payloadLength
			blockBuffer.writeUint32LE(payloadLength, byteOffset);
			byteOffset += 4;

			// payloadHash

			const payloadHash = await hashFactory.sha256(payloadBuffers);

			blockBuffer.fill(payloadHash, byteOffset, byteOffset + hashSize);
			byteOffset += hashSize;

			const generatorPublicKeySize = node0.app.getTagged<number>(
				Identifiers.Cryptography.Identity.PublicKey.Size,
				"type",
				"wallet",
			);
			byteOffset += generatorPublicKeySize; // skip generatorPublicKey

			if (byteOffset !== blockBuffer.byteLength) {
				throw new Error("block not empty");
			}

			const headerSize = node0.app
				.get<Contracts.Crypto.BlockSerializer>(Identifiers.Cryptography.Block.Serializer)
				.headerSize();

			if (byteOffset !== headerSize) {
				throw new Error("invalid header size");
			}

			// merge with transactions
			blockBuffer = Buffer.concat([blockBuffer, ...transactionBuffers]);

			if (
				blockBuffer.byteLength !==
				headerSize + payloadLength - /*TODO: workaround for uint32 mismatch */ 2 * transactions.length
			) {
				throw new Error("invalid block buffer size");
			}

			// 4)
			console.log("block", blockBuffer.toString("hex"));
			const messageSerializer = node0.app.get<Contracts.Crypto.MessageSerializer>(
				Identifiers.Cryptography.Message.Serializer,
			);

			const proposedBytes = await messageSerializer.serializeProposed({
				block: {
					serialized: blockBuffer.toString("hex"),
				} as Contracts.Crypto.Block,
				lockProof: undefined,
			});

			const serializedProposal = await messageSerializer.serializeProposal(
				{
					block: { serialized: proposedBytes.toString("hex") },
					round,
					validRound: undefined,
					validatorIndex: 0,
				},
				{ includeSignature: false },
			);

			const proposalSignature = await node0.app
				.getTagged<Contracts.Crypto.Signature>(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
				.sign(serializedProposal, Buffer.from(validators[0].consensusPrivateKey, "hex"));

			const signedProposal = Buffer.concat([serializedProposal, Buffer.from(proposalSignature, "hex")]);

			const proposal = new Proposal({
				validatorIndex: 0,
				round,
				block: {
					// NOTE: the consensus expects a block to check the round and height.
					// but we only care about the 'serialized' field which ultimately gets broadcasted
					// to other validators.
					block: {
						...emptyBlock,
						serialized: blockBuffer.toString("hex"),
					},
					serialized: proposedBytes.toString("hex"),
				},
				height: emptyBlock.header.height,
				signature: proposalSignature,
				serialized: signedProposal,
			});

			// broadcast
			node0.app
				.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
				.process(proposal);

			stubPropose.restore();
		});

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		// round 0 fails
		await assertBockRound(nodes, 1);
	});
});
