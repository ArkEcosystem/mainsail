import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	#evm!: Evm;

	@postConstruct()
	public initialize() {
		this.#evm = new Evm(this.app.dataPath());
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return this.#evm.view(viewContext);
	}

	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		return this.#evm.process(txContext);
	}

	public async initializeGenesis(commit: Contracts.Evm.GenesisInfo): Promise<void> {
		return this.#evm.initializeGenesis({
			account: commit.account,
			deployerAccount: commit.deployerAccount,
			initialSupply: commit.initialSupply,
			validatorContract: commit.validatorContract,
		});
	}

	public async getAccountInfo(address: string): Promise<Contracts.Evm.AccountInfo> {
		return this.#evm.getAccountInfo(address);
	}

	public async updateRewardsAndVotes(context: Contracts.Evm.UpdateRewardsAndVotesContext): Promise<void> {
		return this.#evm.updateRewardsAndVotes(context);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height, round } = unit;
		await this.#evm.commit({ height: BigInt(height), round: BigInt(round) });
	}

	public async codeAt(address: string): Promise<string> {
		return this.#evm.codeAt(address);
	}

	public async storageAt(address: string, slot: bigint): Promise<string> {
		return this.#evm.storageAt(address, slot);
	}

	public async stateHash(commitKey: Contracts.Evm.CommitKey, currentHash: string): Promise<string> {
		return this.#evm.stateHash(commitKey, currentHash);
	}

	public mode(): Contracts.Evm.EvmMode {
		return Contracts.Evm.EvmMode.Persistent;
	}
}
