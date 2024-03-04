import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Evm } from "./generated/bindings";

@injectable()
export class Instance implements Contracts.Evm.Instance {
	private readonly evm: Evm = new Evm();

	public async configureBlockEnvironment(environment: Contracts.Evm.BlockEnvironment): Promise<void> {
		return this.evm.configureBlockEnv(environment);
	}

	public async transact(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionResult> {
		return this.evm.transact(txContext);
	}

	public async view(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionResult> {
		return this.evm.view(txContext);
	}
}
