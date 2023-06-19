import { inject,injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type HeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	validatorsSignedPrevote: boolean[];
	validatorsSignedPrecommit: boolean[];
}

@injectable()
export class Header {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async getHeader(): Promise<HeaderData> {
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.IRoundStateRepository>(Identifiers.Consensus.RoundStateRepository);

		const height = consensus.getHeight();
		const round = consensus.getRound();
		const step = consensus.getStep();

		const roundState = await roundStateRepo.getRoundState(height, round);

		return {
			height,
			round,
			step,
			validatorsSignedPrecommit: roundState.getValidatorsSignedPrecommit(),
			validatorsSignedPrevote: roundState.getValidatorsSignedPrevote(),
			version: this.app.version(),
		};
	}
}
