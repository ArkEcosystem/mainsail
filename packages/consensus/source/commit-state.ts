import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitState implements Contracts.Processor.ProcessableUnit {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	#store!: Contracts.State.Store;
	#commit!: Contracts.Crypto.Commit;
	#processorResult?: boolean;
	#validators = new Map<string, Contracts.State.ValidatorWallet>();

	@postConstruct()
	public initialize(): void {
		this.#store = this.stateService.createStoreClone();
	}

	public get height(): number {
		return this.#commit.block.data.height;
	}

	public get round(): number {
		return this.#commit.proof.round;
	}

	public get persist(): boolean {
		return false; // Block downloader will store block in database, to improve performance
	}

	public get validators(): string[] {
		return [...this.#validators.keys()];
	}

	public get store(): Contracts.State.Store {
		return this.#store;
	}

	public configure(commit: Contracts.Crypto.Commit): CommitState {
		this.#commit = commit;

		if (commit.block.header.height > 0) {
			const validators = this.validatorSet.getActiveValidators();
			for (const validator of validators) {
				const consensusPublicKey = validator.getConsensusPublicKey();
				this.#validators.set(consensusPublicKey, validator);
			}
		}

		return this;
	}

	public getBlock(): Contracts.Crypto.Block {
		return this.#commit.block;
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

	public async getCommit(): Promise<Contracts.Crypto.Commit> {
		return this.#commit;
	}
}
