import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";

@injectable()
export class MockInstance implements Contracts.Evm.Instance {
	public async transact(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionResult> {
		return {
			gasRefunded: BigInt(0),
			gasUsed: BigInt(0), // TODO: Return provided gas
			logs: [],
			success: true,
		};
	}

	public async view(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionResult> {
		throw new Exceptions.NotImplemented("view", this.constructor.name);
	}
}
