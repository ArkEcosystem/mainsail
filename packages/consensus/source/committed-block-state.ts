import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommittedBlockState implements Contracts.BlockProcessor.IProcessableUnit {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private readonly walletRepository!: Contracts.State.WalletRepositoryClone;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	#height = 0;
	#round = 0;
	#committedBlock?: Contracts.Crypto.ICommittedBlock;
	#processorResult?: boolean;
	#validators = new Map<string, Contracts.State.Wallet>();

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	public async configure(height: number, round: number): Promise<CommittedBlockState> {
		this.#height = height;
		this.#round = round;

		const validators = await this.validatorSet.getActiveValidators();
		for (const validator of validators) {
			const consensuPublicKey = validator.getAttribute<string>("validator.consensusPublicKey");
			this.#validators.set(consensuPublicKey, validator);
		}

		return this;
	}

	public getWalletRepository(): Contracts.State.WalletRepositoryClone {
		return this.walletRepository;
	}

	public getBlock(): Contracts.Crypto.IBlock {
		if (this.#committedBlock) {
			return this.#committedBlock.block;
		}

		throw new Error("Block is not available, because committed block is not set");
	}

	public setProcessorResult(processorResult: boolean): void {
		this.#processorResult = processorResult;
	}

	public getProcessorResult(): boolean {
		return !!this.#processorResult;
	}

	public setCommittedBlock(committedBlock: Contracts.Crypto.ICommittedBlock): void {
		this.#committedBlock = committedBlock;
	}

	public async getProposedCommitBlock(): Promise<Contracts.Crypto.ICommittedBlock> {
		if (this.#committedBlock) {
			return this.#committedBlock;
		}

		throw new Error("Committed block is not available, because it is not set");
	}
}
