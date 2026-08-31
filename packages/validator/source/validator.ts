import type { Contracts } from "@mainsail/contracts";

import { randaoMessage } from "@mainsail/blockchain-utils";
import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Validator implements Contracts.Validator.Validator {
	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Validator.DoubleSignGuard)
	private readonly doubleSignGuard!: Contracts.Validator.DoubleSignGuard;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	#keyPair!: Contracts.Validator.ValidatorKeyPair;

	public configure(keyPair: Contracts.Validator.ValidatorKeyPair): Contracts.Validator.Validator {
		this.#keyPair = keyPair;

		return this;
	}

	public getConsensusPublicKey(): string {
		return this.#keyPair.publicKey;
	}

	public async getRandaoReveal(blockNumber: number): Promise<string> {
		const worker = this.workerPool.getWorker();
		const { privateKey } = await this.#keyPair.getKeyPair();

		return worker.consensusSignature(
			"sign",
			randaoMessage(
				this.stateStore.getGenesisCommit().block.hash,
				this.stateStore.getLastBlock().randaoReveal,
				blockNumber,
			),
			Buffer.from(privateKey, "hex"),
		);
	}

	public async propose(
		validatorIndex: number,
		round: number,
		validRound: number | undefined,
		block: Contracts.Crypto.Block,
		lockProof?: Contracts.Crypto.AggregatedSignature,
	): Promise<Contracts.Crypto.Proposal> {
		await this.doubleSignGuard.guard(this.#keyPair.publicKey, {
			blockNumber: block.number,
			round,
			step: Enums.Consensus.Step.Propose,
			value: block.hash,
		});

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
		await this.doubleSignGuard.guard(this.#keyPair.publicKey, {
			blockNumber,
			round,
			step: Enums.Consensus.Step.Prevote,
			value: blockHash,
		});

		return this.messageFactory.makeMessage(
			{
				blockHash,
				blockNumber,
				round,
				type: Enums.Crypto.MessageType.Prevote,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
			this.#getSignatureContext(),
		);
	}

	public async precommit(
		validatorIndex: number,
		blockNumber: number,
		round: number,
		blockHash: string | undefined,
	): Promise<Contracts.Crypto.Message> {
		await this.doubleSignGuard.guard(this.#keyPair.publicKey, {
			blockNumber,
			round,
			step: Enums.Consensus.Step.Precommit,
			value: blockHash,
		});

		return this.messageFactory.makeMessage(
			{
				blockHash,
				blockNumber,
				round,
				type: Enums.Crypto.MessageType.Precommit,
				validatorIndex,
			},
			await this.#keyPair.getKeyPair(),
			this.#getSignatureContext(),
		);
	}

	#getSignatureContext(): Contracts.Crypto.SignatureMessageContext {
		return {
			genesisBlockHash: this.stateStore.getGenesisCommit().block.hash,
			previousBlockHash: this.stateStore.getLastBlock().hash,
		};
	}
}
