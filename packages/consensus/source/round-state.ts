import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class RoundState implements Contracts.Consensus.IRoundState {
	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.IAggregator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepositoryCloneFactory)
	private readonly walletRepositoryFactory!: Contracts.State.WalletRepositoryCloneFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly blockSerializer!: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#height = 0;
	#round = 0;
	#proposal?: Contracts.Crypto.IProposal;
	#processorResult?: boolean;
	#prevotes = new Map<number, Contracts.Crypto.IPrevote>();
	#prevotesCount = new Map<string | undefined, number>();
	#precommits = new Map<number, Contracts.Crypto.IPrecommit>();
	#precommitsCount = new Map<string | undefined, number>();
	#validators = new Map<string, Contracts.State.IValidatorWallet>();
	#validatorsSignedPrevote: boolean[] = [];
	#validatorsSignedPrecommit: boolean[] = [];
	#proposer!: Contracts.State.IValidatorWallet;

	#committedBlock: Contracts.Crypto.ICommittedBlock | undefined;
	#walletRepository!: Contracts.State.WalletRepositoryClone;

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.walletRepositoryFactory();
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	get proposer(): Contracts.State.IValidatorWallet {
		return this.#proposer;
	}

	public configure(height: number, round: number): RoundState {
		this.#height = height;
		this.#round = round;

		const validators = this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensusPublicKey = validator.getConsensusPublicKey();
			this.#validators.set(consensusPublicKey, validator);
			this.#validatorsSignedPrecommit.push(false);
			this.#validatorsSignedPrevote.push(false);
		}

		const validatorIndex = this.proposerPicker.getValidatorIndex(round);

		this.#proposer = validators[validatorIndex];

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.State.IValidatorWallet {
		const validator = this.#validators.get(consensusPublicKey);
		Utils.assert.defined<Contracts.State.IValidatorWallet>(validator);
		return validator;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.#walletRepository;
	}

	public hasProposal(): boolean {
		if (this.#proposal) {
			return true;
		}

		return false;
	}

	public addProposal(proposal: Contracts.Crypto.IProposal): void {
		if (this.#proposal) {
			throw new Error("Proposal already exists.");
		}

		this.#proposal = proposal;
	}

	public getProposal(): Contracts.Crypto.IProposal | undefined {
		return this.#proposal;
	}

	public getBlock(): Contracts.Crypto.IBlock {
		if (this.#proposal) {
			return this.#proposal.block.block;
		}

		throw new Error("Block is not available, because proposal is not set");
	}

	public async getCommittedBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		if (!this.#committedBlock) {
			const majority = await this.aggregatePrecommits();

			const proposal = this.getProposal();
			Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

			const {
				round,
				block: { block },
			} = proposal;

			const commitBlock: Contracts.Crypto.ICommittedBlockSerializable = {
				block,
				commit: {
					round,
					...majority,
				},
			};

			const serialized = await this.blockSerializer.serializeFull(commitBlock);

			this.#committedBlock = {
				...commitBlock,
				serialized: serialized.toString("hex"),
			};
		}

		return this.#committedBlock;
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public hasProcessorResult(): boolean {
		return this.#processorResult !== undefined;
	}

	public getProcessorResult(): boolean {
		if (this.#processorResult === undefined) {
			throw new Error("Processor result is undefined.");
		}

		return this.#processorResult;
	}

	public hasPrevote(validatorIndex: number): boolean {
		return this.#prevotes.has(validatorIndex);
	}

	public addPrevote(prevote: Contracts.Crypto.IPrevote): void {
		if (this.#prevotes.has(prevote.validatorIndex)) {
			throw new Error("Prevote already exists.");
		}

		this.#prevotes.set(prevote.validatorIndex, prevote);
		this.#validatorsSignedPrevote[prevote.validatorIndex] = true;
		this.#increasePrevoteCount(prevote.blockId);
	}

	public hasPrecommit(validatorIndex: number): boolean {
		return this.#precommits.has(validatorIndex);
	}

	public addPrecommit(precommit: Contracts.Crypto.IPrecommit): void {
		if (this.#precommits.has(precommit.validatorIndex)) {
			throw new Error("Precommit already exists.");
		}

		this.#precommits.set(precommit.validatorIndex, precommit);
		this.#validatorsSignedPrecommit[precommit.validatorIndex] = true;
		this.#increasePrecommitCount(precommit.blockId);
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

	public getPrevote(validatorIndex: number): Contracts.Crypto.IPrevote | undefined {
		return this.#prevotes.get(validatorIndex);
	}

	public getPrecommit(validatorIndex: number): Contracts.Crypto.IPrecommit | undefined {
		return this.#precommits.get(validatorIndex);
	}

	public getValidatorsSignedPrevote(): readonly boolean[] {
		return this.#validatorsSignedPrevote;
	}

	public getValidatorsSignedPrecommit(): readonly boolean[] {
		return this.#validatorsSignedPrecommit;
	}

	public async aggregatePrevotes(): Promise<Contracts.Crypto.IAggregatedSignature> {
		return this.aggregator.aggregate(this.#getSignatures(this.#prevotes));
	}

	public async aggregatePrecommits(): Promise<Contracts.Crypto.IAggregatedSignature> {
		return this.aggregator.aggregate(this.#getSignatures(this.#precommits));
	}

	public logPrevotes(): void {
		for (const key of this.#prevotesCount.keys()) {
			const voters = [...this.#prevotes.values()]
				.filter((prevote) => prevote.blockId === key)
				.map((prevote) => this.validatorSet.getValidator(prevote.validatorIndex).getUsername());

			this.logger.debug(`Block ${key ?? "null"} prevoted by: ${voters.join(", ")}`);
		}
	}

	public logPrecommits(): void {
		for (const key of this.#precommitsCount.keys()) {
			const voters = [...this.#precommits.values()]
				.filter((precommit) => precommit.blockId === key)
				.map((precommit) => this.validatorSet.getValidator(precommit.validatorIndex).getUsername());

			this.logger.debug(`Block ${key ?? "null"} precommitted by: ${voters.join(", ")}`);
		}
	}

	#hasMinorityPrevotes(): boolean {
		return this.#isMinority(this.#prevotes.size);
	}

	#hasMinorityPrecommits(): boolean {
		return this.#isMinority(this.#precommits.size);
	}

	#isMajority(size: number): boolean {
		return Utils.isMajority(size, this.configuration);
	}

	#isMinority(size: number): boolean {
		return Utils.isMinority(size, this.configuration);
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

	#getSignatures(s: Map<number, { signature: string; blockId?: string }>): Map<number, { signature: string }> {
		Utils.assert.defined<Contracts.Crypto.IProposal>(this.#proposal);
		const filtered: Map<number, { signature: string }> = new Map();

		for (const [key, value] of s) {
			if (value.blockId === this.#proposal.block.block.header.id) {
				filtered.set(key, value);
			}
		}

		return filtered;
	}
}
