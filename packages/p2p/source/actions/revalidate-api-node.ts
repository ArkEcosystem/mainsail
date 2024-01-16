import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

import { ApiNodeProcessor } from "../peer-api-node-processor";

export class RevalidateApiNodeAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const apiNode: Contracts.P2P.ApiNode = arguments_.apiNode;

		return this.#app.get<ApiNodeProcessor>(Identifiers.P2P.ApiNode.Processor).revalidateApiNode(apiNode);
	}
}
