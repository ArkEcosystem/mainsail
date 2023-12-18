import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommittedBlockState implements Contracts.Processor.ProcessableUnit {
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	#walletRepository!: Contracts.State.WalletRepositoryClone;
	#committedBlock!: Contracts.Crypto.CommittedBlock;
	#processorResult?: boolean;
	#validators = new Map<string, Contracts.State.ValidatorWallet>();

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.stateService.createWalletRepositoryClone();
	}

	get height(): number {
		return this.#committedBlock.block.data.height;
	}

	get round(): number {
		return this.#committedBlock.commit.round;
	}

	get persist(): boolean {
		return false; // Block downloader will store block in database, to improve performance
	}

	get validators(): string[] {
		return [...this.#validators.keys()];
	}

	public configure(committedBlock: Contracts.Crypto.CommittedBlock): CommittedBlockState {
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

	public getBlock(): Contracts.Crypto.Block {
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

	public async getCommittedBlock(): Promise<Contracts.Crypto.CommittedBlock> {
		return this.#committedBlock;
	}
}
