import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Evm } from "../generated/bindings.cjs";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance {
	private readonly evm: Evm = new Evm();

	public async setAutoCommit(enabled: boolean): Promise<void> {
		return this.evm.setAutoCommit(enabled);
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return this.evm.view(viewContext);
	}

	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		return this.evm.process(txContext);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height, round } = unit;
		await this.evm.commit({ height: BigInt(height), round: BigInt(round) });
	}
}
