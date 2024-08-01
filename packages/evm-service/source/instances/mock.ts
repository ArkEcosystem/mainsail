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
		};
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return {
			success: true,
		};
	}

	public async updateAccountInfo(context: Contracts.Evm.AccountUpdateContext): Promise<void> {}
	public async getAccountInfo(address: string): Promise<Contracts.Evm.AccountInfo> {
		return { balance: 0n, nonce: 0n };
	}

	public async configure(height: bigint, round: bigint): Promise<void> {}
	public async onCommit(_: Contracts.Processor.ProcessableUnit): Promise<void> {}
	public async stateHash(_: string): Promise<string> {
		return "";
	}

	public async codeAt(address: string): Promise<string> {
		return "";
	}

	public async storageAt(address: string, slot: BigInt): Promise<string> {
		return "";
	}

	public mode(): Contracts.Evm.EvmMode {
		return Contracts.Evm.EvmMode.Mock;
	}
}
