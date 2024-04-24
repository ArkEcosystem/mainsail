import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MockInstance implements Contracts.Evm.Instance {
	private _pendingTransactions: Contracts.Evm.TransactionContext[] = [];

	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		if (!txContext.readonly) {
			this._pendingTransactions.push(txContext);
		}

		return {
			receipt: {
				gasRefunded: BigInt(0),
				gasUsed: BigInt(0), // TODO: Return provided gas
				logs: [],
				success: true,
			},
		};
	}

	public async commit(): Promise<Contracts.Evm.CommitResult> {
		this._pendingTransactions = [];

		return {};
	}
}
