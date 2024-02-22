import { injectable } from "@mainsail/container";
import { Evm, JsTransactionContext, JsTransactionResult } from "./generated/bindings";

@injectable()
export class Instance {
    private readonly evm: Evm = new Evm();

    public async transact(txCtx: JsTransactionContext): Promise<JsTransactionResult> {
        return this.evm.transact(txCtx);
    }

    public  async view(txCtx: JsTransactionContext): Promise<JsTransactionResult> {
        return this.evm.view(txCtx);
    }
}