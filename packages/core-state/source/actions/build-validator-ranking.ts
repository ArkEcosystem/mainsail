import { Services, Types } from "@arkecosystem/core-kernel";

import { DposState } from "../dpos";

export class BuildValidatorRankingAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const dposState: DposState = arguments_.dposState;

		return dposState.buildValidatorRanking();
	}
}
