import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommittedBlockState implements Contracts.BlockProcessor.IProcessableUnit {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepositoryClone;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	#committedBlock!: Contracts.Crypto.ICommittedBlock;
	#processorResult?: boolean;
	#validators = new Map<string, Contracts.State.Wallet>();

	get height(): number {
		return this.#committedBlock.commit.height;
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
			const consensusPublicKey = validator.getAttribute<string>("validator.consensusPublicKey");
			this.#validators.set(consensusPublicKey, validator);
		}

		return this;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.walletRepository;
	}

	public getBlock(): Contracts.Crypto.IBlock {
		return this.#committedBlock.block;
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public getProcessorResult(): boolean {
		return !!this.#processorResult;
	}

	public async getProposedCommitBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		return this.#committedBlock;
	}
}
