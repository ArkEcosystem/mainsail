import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

import { PeerApiNodeProcessor } from "../peer-api-node-processor";

export class ValidateAndAcceptApiNodeAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const apiNode: Contracts.P2P.PeerApiNode = arguments_.apiNode;
		const options: Contracts.P2P.AcceptNewPeerOptions = arguments_.options;

		return this.#app
			.get<PeerApiNodeProcessor>(Identifiers.PeerApiNodeProcessor)
			.validateAndAcceptApiNode(apiNode, options);
	}
}
