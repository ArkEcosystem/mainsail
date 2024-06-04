import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Evm } from "../generated/bindings.cjs";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	#evm!: Evm;

	#lastCommitKey?: Contracts.Evm.CommitKey;
	// Cache by sequence number, since we can't rely on the hash being available yet
	#resultCache: Map<number, Contracts.Evm.ProcessResult> = new Map();

	@postConstruct()
	public initialize() {
		this.#evm = new Evm(this.app.dataPath());
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return this.#evm.view(viewContext);
	}

	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		const { commitKey } = txContext;

		if (
			txContext.sequence !== undefined &&
			this.#lastCommitKey?.height === commitKey.height &&
			this.#lastCommitKey?.round === commitKey.round
		) {
			// Return cached result if the transaction has already been processed for the given commit
			// This happens when e.g. receiving the transaction directly from the collator
			if (this.#resultCache.has(txContext.sequence)) {
				return this.#resultCache.get(txContext.sequence)!;
			}
		} else {
			// If commitKey changes (outside of onCommit) reset everything
			this.#resultCache.clear();
			this.#lastCommitKey = commitKey;
		}

		const result = await this.#evm.process(txContext);

		if (txContext.sequence !== undefined) {
			this.#resultCache.set(txContext.sequence, result);
		}

		return result;
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height, round } = unit;
		await this.#evm.commit({ height: BigInt(height), round: BigInt(round) });

		this.#resultCache.clear();
		this.#lastCommitKey = undefined;
	}
}
