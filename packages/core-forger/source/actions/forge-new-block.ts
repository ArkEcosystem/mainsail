import { Contracts } from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";

export class ForgeNewBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const forgerService: ForgerService = arguments_.forgerService;
		const validator: Contracts.Forger.Validator = arguments_.validator;
		const round: Contracts.P2P.CurrentRound = arguments_.round;
		const networkState: Contracts.P2P.NetworkState = arguments_.networkState;

		return forgerService.forgeNewBlock(validator, round, networkState);
	}
}
