import Contracts from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";
import { Delegate } from "../interfaces";

export class IsForgingAllowedAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const forgerService: ForgerService = arguments_.forgerService;
		const delegate: Delegate = arguments_.delegate;
		const networkState: Contracts.P2P.NetworkState = arguments_.networkState;

		return forgerService.isForgingAllowed(networkState, delegate);
	}
}
