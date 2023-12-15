import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

import { PeerApiNodeProcessor } from "../peer-api-node-processor";

export class RevalidateApiNodeAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const apiNode: Contracts.P2P.PeerApiNode = arguments_.apiNode;

		return this.#app
			.get<PeerApiNodeProcessor>(Identifiers.PeerApiNodeProcessor)
			.revalidateApiNode(apiNode);
	}
}
