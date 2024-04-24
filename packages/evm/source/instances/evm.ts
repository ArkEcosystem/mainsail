import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Evm, JsCommitResult, JsProcessResult, JsTransactionContext } from "../generated/bindings.cjs";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	private readonly evm: Evm = new Evm();

	public async process(txContext: JsTransactionContext): Promise<JsProcessResult> {
		return this.evm.process(txContext);
	}

	public async commit(): Promise<JsCommitResult> {
		return this.evm.commit();
	}
}
