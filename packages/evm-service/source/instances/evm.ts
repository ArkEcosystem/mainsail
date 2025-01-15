import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Evm, LogLevel } from "@mainsail/evm";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	#evm!: Evm;

	@postConstruct()
	public initialize() {
		this.#evm = new Evm(this.app.dataPath(), (level: LogLevel, message: string) => {
			try {
				switch (level) {
					case LogLevel.Info: {
						this.logger.info(message);
						break;
					}
					case LogLevel.Debug: {
						this.logger.debug(message);
						break;
					}
					case LogLevel.Notice: {
						this.logger.notice(message);
						break;
					}
					case LogLevel.Emergency: {
						this.logger.emergency(message);
						break;
					}
					case LogLevel.Alert: {
						this.logger.alert(message);
						break;
					}
					case LogLevel.Critical: {
						this.logger.critical(message);
						break;
					}
					case LogLevel.Warning: {
						this.logger.warning(message);
						break;
					}
				}
			} catch {}
		});
	}

	public async dispose(): Promise<void> {
		await this.#evm.dispose();
	}

	public async prepareNextCommit(context: Contracts.Evm.PrepareNextCommitContext): Promise<void> {
		return this.#evm.prepareNextCommit(context);
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
			usernameContract: commit.usernameContract,
			validatorContract: commit.validatorContract,
		});
	}

	public async getAccountInfo(address: string): Promise<Contracts.Evm.AccountInfo> {
		return this.#evm.getAccountInfo(address);
	}

	public async getAccountInfoExtended(address: string): Promise<Contracts.Evm.AccountInfoExtended> {
		return this.#evm.getAccountInfoExtended(address);
	}

	public async importAccountInfo(info: Contracts.Evm.AccountInfoExtended): Promise<void> {
		return this.#evm.importAccountInfo(info);
	}

	public async getAccounts(offset: bigint, limit: bigint): Promise<Contracts.Evm.GetAccountsResult> {
		return this.#evm.getAccounts(offset, limit);
	}

	public async getReceipts(offset: bigint, limit: bigint): Promise<Contracts.Evm.GetReceiptsResult> {
		return this.#evm.getReceipts(offset, limit);
	}

	public async getReceipt(height: number, txHash: string): Promise<Contracts.Evm.GetReceiptResult> {
		return this.#evm.getReceipt(BigInt(height), txHash);
	}

	public async updateRewardsAndVotes(context: Contracts.Evm.UpdateRewardsAndVotesContext): Promise<void> {
		return this.#evm.updateRewardsAndVotes(context);
	}

	public async calculateActiveValidators(context: Contracts.Evm.CalculateActiveValidatorsContext): Promise<void> {
		return this.#evm.calculateActiveValidators(context);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height } = unit;
		const round = unit.getBlock().data.round;

		const result = await this.#evm.commit({ height: BigInt(height), round: BigInt(round) });
		unit.setAccountUpdates(result.dirtyAccounts);
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
