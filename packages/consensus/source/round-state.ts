import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class RoundState implements Contracts.Consensus.RoundState {
	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.ProposerSelector;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitBlockSerializer;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#height = 0;
	#round = 0;
	#proposal?: Contracts.Crypto.Proposal;
	#processorResult?: boolean;
	#prevotes = new Map<number, Contracts.Crypto.Prevote>();
	#prevotesCount = new Map<string | undefined, number>();
	#precommits = new Map<number, Contracts.Crypto.Precommit>();
	#precommitsCount = new Map<string | undefined, number>();
	#validators = new Map<string, Contracts.State.ValidatorWallet>();
	#validatorsSignedPrevote: boolean[] = [];
	#validatorsSignedPrecommit: boolean[] = [];
	#proposer!: Contracts.State.ValidatorWallet;

	#committedBlock: Contracts.Crypto.CommittedBlock | undefined;
	#walletRepository!: Contracts.State.WalletRepositoryClone;

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.stateService.createWalletRepositoryClone();
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get persist(): boolean {
		return true; // Store block in database every time
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	get proposer(): Contracts.State.ValidatorWallet {
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

		const validatorIndex = this.proposerSelector.getValidatorIndex(round);

		this.#proposer = validators[validatorIndex];

		return this;
	}

	public getValidator(consensusPublicKey: string): Contracts.State.ValidatorWallet {
		const validator = this.#validators.get(consensusPublicKey);
		Utils.assert.defined<Contracts.State.ValidatorWallet>(validator);
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

	public addProposal(proposal: Contracts.Crypto.Proposal): void {
		if (this.#proposal) {
			throw new Error("Proposal already exists.");
		}

		this.#proposal = proposal;
	}

	public getProposal(): Contracts.Crypto.Proposal | undefined {
		return this.#proposal;
	}

	public getBlock(): Contracts.Crypto.Block {
		if (this.#proposal) {
			return this.#proposal.block.block;
		}

		throw new Error("Block is not available, because proposal is not set");
	}

	public async getCommittedBlock(): Promise<Contracts.Crypto.CommittedBlock> {
		if (!this.#committedBlock) {
			const majority = await this.aggregatePrecommits();

			const proposal = this.getProposal();
			Utils.assert.defined<Contracts.Crypto.Proposal>(proposal);

			const {
				round,
				block: { block },
			} = proposal;

			const commitBlock: Contracts.Crypto.CommittedBlockSerializable = {
				block,
				commit: {
					round,
					...majority,
				},
			};

			const serialized = await this.commitSerializer.serializeFull(commitBlock);

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

	public addPrevote(prevote: Contracts.Crypto.Prevote): void {
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

	public addPrecommit(precommit: Contracts.Crypto.Precommit): void {
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

	public getPrevote(validatorIndex: number): Contracts.Crypto.Prevote | undefined {
		return this.#prevotes.get(validatorIndex);
	}

	public getPrevotes(): Contracts.Crypto.Prevote[] {
		return [...this.#prevotes.values()];
	}

	public getPrecommit(validatorIndex: number): Contracts.Crypto.Precommit | undefined {
		return this.#precommits.get(validatorIndex);
	}

	public getPrecommits(): Contracts.Crypto.Precommit[] {
		return [...this.#precommits.values()];
	}

	public getValidatorsSignedPrevote(): readonly boolean[] {
		return this.#validatorsSignedPrevote;
	}

	public getValidatorsSignedPrecommit(): readonly boolean[] {
		return this.#validatorsSignedPrecommit;
	}

	public async aggregatePrevotes(): Promise<Contracts.Crypto.AggregatedSignature> {
		const { activeValidators } = this.configuration.getMilestone(this.#height);
		return this.aggregator.aggregate(this.#getSignatures(this.#prevotes), activeValidators);
	}

	public async aggregatePrecommits(): Promise<Contracts.Crypto.AggregatedSignature> {
		const { activeValidators } = this.configuration.getMilestone(this.#height);
		return this.aggregator.aggregate(this.#getSignatures(this.#precommits), activeValidators);
	}

	public logPrevotes(): void {
		for (const key of this.#prevotesCount.keys()) {
			const voters = [...this.#prevotes.values()]
				.filter((prevote) => prevote.blockId === key)
				.map((prevote) => this.validatorSet.getValidator(prevote.validatorIndex).getWalletPublicKey());

			this.logger.debug(`Block ${key ?? "null"} prevoted by: ${voters.join(", ")}`);
		}
	}

	public logPrecommits(): void {
		for (const key of this.#precommitsCount.keys()) {
			const voters = [...this.#precommits.values()]
				.filter((precommit) => precommit.blockId === key)
				.map((precommit) => this.validatorSet.getValidator(precommit.validatorIndex).getWalletPublicKey());

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
		const { activeValidators } = this.configuration.getMilestone(this.#height);
		return Utils.isMajority(size, activeValidators);
	}

	#isMinority(size: number): boolean {
		const { activeValidators } = this.configuration.getMilestone(this.#height);
		return Utils.isMinority(size, activeValidators);
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
		Utils.assert.defined<Contracts.Crypto.Proposal>(this.#proposal);
		const filtered: Map<number, { signature: string }> = new Map();

		for (const [key, value] of s) {
			if (value.blockId === this.#proposal.block.block.header.id) {
				filtered.set(key, value);
			}
		}

		return filtered;
	}
}
