import { injectable, multiInject } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class BlockVerifier implements Contracts.Processor.Verifier {
	@multiInject(Identifiers.Processor.BlockVerifierHandlers)
	private readonly handlers!: Contracts.Processor.Handler[];

	public async verify(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		for (const handler of this.handlers) {
			await handler.execute(unit);
		}
	}
}
