import Contracts from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";
import { Validator } from "../interfaces";

export class IsForgingAllowedAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const forgerService: ForgerService = arguments_.forgerService;
		const validator: Validator = arguments_.validator;
		const networkState: Contracts.P2P.NetworkState = arguments_.networkState;

		return forgerService.isForgingAllowed(networkState, validator);
	}
}
