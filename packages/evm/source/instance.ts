import { injectable } from "@mainsail/container";

import { Evm, JsTransactionContext, JsTransactionResult } from "./generated/bindings";

@injectable()
export class Instance {
	private readonly evm: Evm = new Evm();

	public async transact(txContext: JsTransactionContext): Promise<JsTransactionResult> {
		return this.evm.transact(txContext);
	}

	public async view(txContext: JsTransactionContext): Promise<JsTransactionResult> {
		return this.evm.view(txContext);
	}
}
