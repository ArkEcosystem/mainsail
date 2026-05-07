import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { assert } from "@mainsail/utils";

@injectable()
export class Validator implements Contracts.Validator.Validator {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	@inject(Identifiers.Validator.TransactionForger)
	protected readonly transactionForger!: Contracts.Validator.TransactionForger;

	#keyPair!: Contracts.Validator.ValidatorKeyPair;

	public configure(keyPair: Contracts.Validator.ValidatorKeyPair): Contracts.Validator.Validator {
		this.#keyPair = keyPair;

		return this;
	}

	public getConsensusPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async prepareBlock(
		generatorAddress: string,
		round: number,
		timestamp: number,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const blockNumber = previousBlock.number + 1;

		const { fee, gasUsed, logsBloom, stateRoot, transactions } = await this.transactionForger.getTransactions(
			generatorAddress,
			timestamp,
			{
				blockNumber: BigInt(blockNumber),
				round: BigInt(round),
			},
		);
		return this.#makeBlock(round, generatorAddress, logsBloom, stateRoot, transactions, timestamp, gasUsed, fee);
	}

	public async propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Contracts.Crypto.Block,
		lockProof?: Contracts.Crypto.AggregatedSignature,
	): Promise<Contracts.Crypto.Proposal> {
		const serializedProposedData = await this.proposalSerializer.serializePayload({ block, lockProof });
		return this.proposalFactory.makeProposal(
			{
				payloadSerialized: serializedProposedData.toString("hex"),
				round,
				validatorIndex,
				validRound,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async prevote(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Message> {
		return this.messageFactory.makeMessage(
			{
				blockHash,
				blockNumber,
				round,
				type: Enums.Crypto.MessageType.Prevote,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	public async precommit(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Message> {
		return this.messageFactory.makeMessage(
			{
				blockHash,
				blockNumber,
				round,
				type: Enums.Crypto.MessageType.Precommit,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
		);
	}

	async #makeBlock(
		round: number,
		proposer: string,
		logsBloom: string,
		stateRoot: string,
		transactions: Contracts.Crypto.Transaction[],
		timestamp: number,
		gasUsed: number,
		fee: bigint,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const number = previousBlock.number + 1;
		const milestone = this.cryptoConfiguration.getMilestone(number);

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The payload length needs to account for the overhead of each serialized transaction
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		for (const transaction of transactions) {
			assert.string(transaction.hash);

			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
			transactionData.push(transaction.toData());
			payloadSize += transaction.serialized.length;
		}

		return this.blockFactory.make(
			{
				fee,
				gasUsed,
				logsBloom,
				number,
				parentHash: previousBlock.hash,
				payloadSize,
				proposer,
				reward: BigInt(milestone.reward),
				round,
				stateRoot,
				timestamp,
				transactionsCount: transactionData.length,
				transactionsRoot: this.hashFactory.sha256(payloadBuffers).toString("hex"),
				version: 1,
			},
			transactions,
		);
	}
}
