import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class RoundState implements Contracts.Consensus.IRoundState {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepositoryClone;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.Cryptography.Message.Verifier)
	private readonly verifier!: Contracts.Crypto.IMessageVerifier;

	#height = 0;
	#round = 0;
	#proposal?: Contracts.Crypto.IProposal;
	#processorResult?: boolean;
	#prevotes = new Map<string, Contracts.Crypto.IPrevote>();
	#prevotesCount = new Map<string | undefined, number>();
	#precommits = new Map<string, Contracts.Crypto.IPrecommit>();
	#precommitsCount = new Map<string | undefined, number>();
	#validators = new Map<string, Contracts.State.Wallet>();
	#validatorsSignedPrevote: boolean[] = [];
	#validatorsSignedPrecommit: boolean[] = [];
	#proposer!: string;

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	get proposer(): string {
		return this.#proposer;
	}

	public async configure(height: number, round: number, seed: string): Promise<RoundState> {
		this.#height = height;
		this.#round = round;

		const validators = await this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensuPublicKey = validator.getAttribute<string>("validator.consensusPublicKey");
			this.#validators.set(consensuPublicKey, validator);
			this.#validatorsSignedPrecommit.push(false);
			this.#validatorsSignedPrevote.push(false);
		}
		this.#proposer =
			validators[this.proposerPicker.getValidatorIndex(height, seed)].getAttribute<string>(
				"validator.consensusPublicKey",
			);

		return this;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.walletRepository;
	}

	public hasProposal(): boolean {
		if (this.#proposal) {
			return true;
		}

		return false;
	}

	public async addProposal(proposal: Contracts.Crypto.IProposal): Promise<boolean> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(proposal.validatorIndex);

		if (this.#proposer !== validatorPublicKey) {
			return false;
		}

		if (this.#proposal) {
			// TODO: Handle evidence
			return false;
		}

		this.#proposal = proposal;

		return true;
	}

	public getProposal(): Contracts.Crypto.IProposal | undefined {
		return this.#proposal;
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public getProcessorResult(): boolean {
		return !!this.#processorResult;
	}

	public hasPrevote(validator: Contracts.Consensus.IValidator): boolean {
		return this.#prevotes.has(validator.getConsensusPublicKey());
	}

	public async addPrevote(prevote: Contracts.Crypto.IPrevote): Promise<boolean> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(prevote.validatorIndex);
		if (!this.#validators.has(validatorPublicKey)) {
			return false;
		}

		if (this.#prevotes.has(validatorPublicKey)) {
			// TODO: Handle evidence

			return false;
		}

		this.#prevotes.set(validatorPublicKey, prevote);
		this.#validatorsSignedPrevote[prevote.validatorIndex] = true;
		this.#increasePrevoteCount(prevote.blockId);
		return true;
	}

	public hasPrecommit(validator: Contracts.Consensus.IValidator): boolean {
		return this.#precommits.has(validator.getConsensusPublicKey());
	}

	public async addPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<boolean> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(precommit.validatorIndex);
		if (!this.#validators.has(validatorPublicKey)) {
			return false;
		}

		if (this.#precommits.has(validatorPublicKey)) {
			return false;
		}

		this.#precommits.set(validatorPublicKey, precommit);
		this.#validatorsSignedPrecommit[precommit.validatorIndex] = true;
		this.#increasePrecommitCount(precommit.blockId);
		return true;
	}

	public hasMajorityPrevotes(): boolean {
		if (!this.#proposal) {
			return false;
		}

		return this.#isMajority(this.#getPrevoteCount(this.#proposal.block.block.data.id));
	}

	public hasMajorityPrevotesAny(): boolean {
		return this.#isMajority(this.#prevotes.size);
	}

	public hasMajorityPrevotesNull(): boolean {
		return this.#isMajority(this.#getPrevoteCount());
	}

	public hasMajorityPrecommits(): boolean {
		if (!this.#proposal) {
			return false;
		}

		return this.#isMajority(this.#getPrecommitCount(this.#proposal.block.block.data.id));
	}

	public hasMajorityPrecommitsAny(): boolean {
		return this.#isMajority(this.#precommits.size);
	}

	public hasMinorityPrevotesOrPrecommits(): boolean {
		return this.#hasMinorityPrevotes() || this.#hasMinorityPrecommits();
	}

	getPrevote(validatorIndex: number): Contracts.Crypto.IPrevote | undefined {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex);

		return this.#prevotes.get(validatorPublicKey);
	}

	getPrecommit(validatorIndex: number): Contracts.Crypto.IPrecommit | undefined {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex);

		return this.#precommits.get(validatorPublicKey);
	}

	public getValidatorsSignedPrevote(): boolean[] {
		return this.#validatorsSignedPrevote;
	}

	public getValidatorsSignedPrecommit(): boolean[] {
		return this.#validatorsSignedPrecommit;
	}

	public async hasValidProposalLockProof(): Promise<boolean> {
		const proposal = this.#proposal;
		const lockProof = this.#proposal?.block?.lockProof;
		if (!lockProof) {
			return false;
		}

		Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

		const { verified } = await this.verifier.verifyProposalLockProof(
			{
				blockId: proposal.block.block.header.id,
				height: proposal.height,
				round: proposal.round,
				type: Contracts.Crypto.MessageType.Prevote,
			},
			lockProof,
		);

		return verified;
	}

	#hasMinorityPrevotes(): boolean {
		return this.#isMinority(this.#prevotes.size);
	}

	#hasMinorityPrecommits(): boolean {
		return this.#isMinority(this.#precommits.size);
	}

	#isMajority(size: number): boolean {
		return size >= (this.configuration.getMilestone().activeValidators / 3) * 2 + 1;
	}

	#isMinority(size: number): boolean {
		return size >= this.configuration.getMilestone().activeValidators / 3 + 1;
	}

	#increasePrevoteCount(blockId?: string): void {
		this.#prevotesCount.set(blockId, this.#getPrevoteCount(blockId) + 1);
	}

	#getPrevoteCount(blockId?: string): number {
		return this.#prevotesCount.get(blockId) ?? 0;
	}

	#increasePrecommitCount(blockId?: string): void {
		this.#precommitsCount.set(blockId, this.#getPrecommitCount(blockId) + 1);
	}

	#getPrecommitCount(blockId?: string): number {
		return this.#precommitsCount.get(blockId) ?? 0;
	}

	public async aggregateMajorityPrevotes(): Promise<Contracts.Crypto.IValidatorSetMajority> {
		if (!this.hasMajorityPrevotes()) {
			throw new Error("called #aggregateMajorityPrevotes without majority");
		}

		return this.#aggregateValidatorSetMajority(this.#getValidatorMajority(this.#prevotes));
	}

	public async aggregateMajorityPrecommits(): Promise<Contracts.Crypto.IValidatorSetMajority> {
		if (!this.hasMajorityPrecommits()) {
			throw new Error("called #aggregateMajorityPrecommits without majority");
		}

		return this.#aggregateValidatorSetMajority(this.#getValidatorMajority(this.#precommits));
	}

	async #aggregateValidatorSetMajority(
		majority: Map<string, { signature: string }>,
	): Promise<Contracts.Crypto.IValidatorSetMajority> {
		const signatures: Buffer[] = [];

		const numberOfValidators = this.configuration.getMilestone().activeValidators;
		const validators: boolean[] = new Array(numberOfValidators).fill(false);

		for (const [key, { signature }] of majority) {
			signatures.push(Buffer.from(signature, "hex"));

			const validator = this.#validators.get(key);
			Utils.assert.defined<Contracts.State.Wallet>(validator);

			const walletPublicKey = validator.getPublicKey();
			Utils.assert.defined<string>(walletPublicKey);

			const validatorIndex = this.validatorSet.getValidatorIndexByPublicKey(walletPublicKey);
			validators[validatorIndex] = true;
		}

		const signature = await this.signatureFactory.aggregate(signatures);

		return {
			signature,
			validators,
		};
	}

	#getValidatorMajority(s: Map<string, { signature: string; blockId?: string }>): Map<string, { signature: string }> {
		Utils.assert.defined<Contracts.Crypto.IProposal>(this.#proposal);
		const filtered = new Map();

		for (const [key, value] of s) {
			if (value.blockId === this.#proposal.block.block.header.id) {
				filtered.set(key, value);
			}
		}

		return filtered;
	}

	public async getProposalLockProof(): Promise<Contracts.Crypto.IProposalLockProof> {
		const majority = await this.aggregateMajorityPrevotes();

		const proposal = this.getProposal();
		Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

		return {
			...majority,
		};
	}

	public async getProposedCommitBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		const majority = await this.aggregateMajorityPrecommits();

		const proposal = this.getProposal();
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
}
