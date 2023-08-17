import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class RoundState implements Contracts.Consensus.IRoundState {
	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.IAggregator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepositoryClone;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

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

	public configure(height: number, round: number): RoundState {
		this.#height = height;
		this.#round = round;

		const validators = this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensusPublicKey = validator.getAttribute<string>("validator.consensusPublicKey");
			this.#validators.set(consensusPublicKey, validator);
			this.#validatorsSignedPrecommit.push(false);
			this.#validatorsSignedPrevote.push(false);
		}

		const validatorIndex = this.proposerPicker.getValidatorIndex(round);

		this.#proposer = validators[validatorIndex].getAttribute<string>("validator.consensusPublicKey");

		return this;
	}

	public getValidator(validatorPublicKey: string): Contracts.State.Wallet {
		const validator = this.#validators.get(validatorPublicKey);
		Utils.assert.defined<Contracts.State.Wallet>(validator);
		return validator;
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
		this.#proposal = proposal;

		return true;
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

	public async getProposedCommitBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		return this.aggregator.getProposedCommitBlock(this);
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
		return this.#prevotes.has(this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex));
	}

	public async addPrevote(prevote: Contracts.Crypto.IPrevote): Promise<boolean> {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(prevote.validatorIndex);
		if (!this.#validators.has(validatorPublicKey)) {
			throw new Error(`Prevote by ${validatorPublicKey} is already set`);
		}

		this.#prevotes.set(validatorPublicKey, prevote);
		this.#validatorsSignedPrevote[prevote.validatorIndex] = true;
		this.#increasePrevoteCount(prevote.blockId);
		return true;
	}

	public hasPrecommit(validatorIndex: number): boolean {
		return this.#precommits.has(this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex));
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

	public getPrevote(validatorIndex: number): Contracts.Crypto.IPrevote | undefined {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex);

		return this.#prevotes.get(validatorPublicKey);
	}

	public getPrecommit(validatorIndex: number): Contracts.Crypto.IPrecommit | undefined {
		const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(validatorIndex);

		return this.#precommits.get(validatorPublicKey);
	}

	public getValidatorsSignedPrevote(): boolean[] {
		return this.#validatorsSignedPrevote;
	}

	public getValidatorsSignedPrecommit(): boolean[] {
		return this.#validatorsSignedPrecommit;
	}

	public getValidatorPrevoteSignatures(): Map<string, { signature: string }> {
		return this.#getValidatorMajority(this.#prevotes);
	}

	public getValidatorPrecommitSignatures(): Map<string, { signature: string }> {
		return this.#getValidatorMajority(this.#precommits);
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
}
