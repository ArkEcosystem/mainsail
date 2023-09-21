import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommittedBlockState implements Contracts.BlockProcessor.IProcessableUnit {
	@inject(Identifiers.WalletRepositoryCloneFactory)
	private readonly walletRepositoryFactory!: Contracts.State.WalletRepositoryCloneFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	#walletRepository!: Contracts.State.WalletRepositoryClone;
	#committedBlock!: Contracts.Crypto.ICommittedBlock;
	#processorResult?: boolean;
	#validators = new Map<string, Contracts.State.IValidatorWallet>();

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.walletRepositoryFactory();
	}

	get height(): number {
		return this.#committedBlock.block.data.height;
	}

	get round(): number {
		return this.#committedBlock.commit.round;
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	public configure(committedBlock: Contracts.Crypto.ICommittedBlock): CommittedBlockState {
		this.#committedBlock = committedBlock;

		const validators = this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensusPublicKey = validator.getConsensusPublicKey();
			this.#validators.set(consensusPublicKey, validator);
		}

		return this;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.#walletRepository;
	}

	public getBlock(): Contracts.Crypto.IBlock {
		return this.#committedBlock.block;
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public hasProcessorResult(): boolean {
		return this.#processorResult !== undefined;
	}

	public getProcessorResult(): boolean {
		if (this.#processorResult == undefined) {
			throw new Error("Processor result is undefined.");
		}

		return this.#processorResult;
	}

	public async getCommittedBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		return this.#committedBlock;
	}
}
