import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Evm, JsTransactionContext, JsTransactionResult } from "../generated/bindings.cjs";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	private readonly evm: Evm = new Evm();

	public async transact(txContext: JsTransactionContext): Promise<JsTransactionResult> {
		return this.evm.transact(txContext);
	}

	public async view(txContext: JsTransactionContext): Promise<JsTransactionResult> {
		return this.evm.view(txContext);
	}
}
