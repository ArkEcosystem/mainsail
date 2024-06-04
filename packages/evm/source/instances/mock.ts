import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MockInstance implements Contracts.Evm.Instance {
	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		return {
			receipt: {
				gasRefunded: BigInt(0),
				gasUsed: BigInt(0),
				logs: [],
				success: true,
			},
			mocked: true,
		};
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return {
			success: true,
		};
	}

	public async configure(height: bigint, round: bigint): Promise<void> {}
	public async onCommit(_: Contracts.Processor.ProcessableUnit): Promise<void> {}
}
