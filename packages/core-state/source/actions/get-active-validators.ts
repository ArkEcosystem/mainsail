import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { RoundState } from "../round-state";

export class GetActiveValidatorsAction extends Services.Triggers.Action {
	private app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<Contracts.State.Wallet[]> {
		const roundInfo: Contracts.Shared.RoundInfo = arguments_.roundInfo;
		const validators: Contracts.State.Wallet[] = arguments_.validators;

		return this.app.get<RoundState>(Identifiers.RoundState).getActiveValidators(roundInfo, validators);
	}
}
