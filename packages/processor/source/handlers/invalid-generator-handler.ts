import { Contracts } from "@mainsail/contracts";

@injectable()
export class InvalidGeneratorHandler implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(block?: Contracts.Crypto.IBlock): Promise<Contracts.BlockProcessor.ProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		return Contracts.BlockProcessor.ProcessorResult.Rejected;
	}
}
