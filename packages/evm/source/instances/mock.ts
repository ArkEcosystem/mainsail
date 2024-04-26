import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MockInstance implements Contracts.Evm.Instance {
	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		return {
			receipt: {
				gasRefunded: BigInt(0),
				gasUsed: BigInt(0), // TODO: Return provided gas
				logs: [],
				success: true,
			},
		};
	}
	public async setAutoCommit(enabled: boolean): Promise<void> {}
	public async configure(height: bigint, round: bigint): Promise<void> {}
	public async onCommit(_: Contracts.Processor.ProcessableUnit): Promise<void> {}
}
