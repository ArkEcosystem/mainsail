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

	public async getAccountInfo(address: string): Promise<Contracts.Evm.AccountInfo> {
		return this.#evm.getAccountInfo(address);
	}

	public async updateAccountInfo(context: Contracts.Evm.AccountUpdateContext): Promise<void> {
		// NOTE: the assumption is that 'getDirtyWallets' only returns native wallets (i.e. evm-call modifications are excluded)
		// TODO: reduce wallets to current tx
		const dirtyWallets = [...context.walletRepository.getDirtyWallets()];

		return this.#evm.updateAccountInfo({
			commitKey: context.commitKey,
			changes: Object.fromEntries(
				dirtyWallets.map((w) => [
					w.getAddress(),
					{ balance: w.getBalance().toBigInt(), nonce: w.getNonce().toBigInt() },
				]),
			),
		});
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height, round } = unit;
		await this.#evm.commit({ height: BigInt(height), round: BigInt(round) });
	}

	public async stateHash(currentHash: string): Promise<string> {
		return this.#evm.stateHash(currentHash);
	}

	public mode(): Contracts.Evm.EvmMode {
		return Contracts.Evm.EvmMode.Persistent;
	}
}
