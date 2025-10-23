import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";


@injectable()
export class PeerStatistic implements Contracts.P2P.PeerStatistic {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;


	public async logStatistic(): Promise<void> {
		this.logger.info("Logging peer statistics...", "p2p");
	}
}
