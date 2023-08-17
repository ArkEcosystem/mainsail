import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Aggregator implements Contracts.Consensus.IAggregator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async aggregateMajorityPrevotes(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IValidatorSetMajority> {
		if (!roundState.hasMajorityPrevotes()) {
			throw new Error("called aggregateMajorityPrevotes without majority");
		}

		return this.#aggregateValidatorSetMajority(roundState, roundState.getValidatorPrevoteSignatures());
	}

	public async aggregateMajorityPrecommits(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IValidatorSetMajority> {
		if (!roundState.hasMajorityPrecommits()) {
			throw new Error("called aggregateMajorityPrecommits without majority");
		}

		return this.#aggregateValidatorSetMajority(roundState, roundState.getValidatorPrecommitSignatures());
	}

	public async getProposalLockProof(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.IProposalLockProof> {
		const majority = await this.aggregateMajorityPrevotes(roundState);

		const proposal = roundState.getProposal();
		Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

		return {
			...majority,
		};
	}

	public async getProposedCommitBlock(
		roundState: Contracts.Consensus.IRoundState,
	): Promise<Contracts.Crypto.ICommittedBlock> {
		const majority = await this.aggregateMajorityPrecommits(roundState);

		const proposal = roundState.getProposal();
		Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

		const {
			round,
			block: { block },
		} = proposal;

		const commitBlock: Contracts.Crypto.ICommittedBlockSerializable = {
			block,
			commit: {
				blockId: block.data.id,
				height: block.data.height,
				round,
				...majority,
			},
		};

		const serialized = await this.blockSerializer.serializeFull(commitBlock);

		return {
			...commitBlock,
			serialized: serialized.toString("hex"),
		};
	}

	async #aggregateValidatorSetMajority(
		roundState: Contracts.Consensus.IRoundState,
		majority: Map<string, { signature: string }>,
	): Promise<Contracts.Crypto.IValidatorSetMajority> {
		const signatures: Buffer[] = [];

		const numberOfValidators = this.configuration.getMilestone().activeValidators;
		const validators: boolean[] = new Array(numberOfValidators).fill(false);

		for (const [key, { signature }] of majority) {
			signatures.push(Buffer.from(signature, "hex"));

			const validator = roundState.getValidator(key);

			const walletPublicKey = validator.getWalletPublicKey();

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletPublicKey(walletPublicKey);
			validators[validatorIndex] = true;
		}

		const signature = await this.signatureFactory.aggregate(signatures);

		return {
			signature,
			validators,
		};
	}
}
