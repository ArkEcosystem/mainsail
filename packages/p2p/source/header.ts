import { inject,injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type HeaderData = {
	version: string;
	height: number;
}

@injectable()
export class Header {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async getHeader(): Promise<HeaderData> {
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);

		return {
			height: consensus.getHeight(),
			version: this.app.version(),
		};
	}
}
