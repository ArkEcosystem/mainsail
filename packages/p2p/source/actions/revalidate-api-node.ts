import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import { ApiNodeProcessor } from "../api-node-processor.js";

@injectable()
export class RevalidateApiNodeAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: { apiNode: Contracts.P2P.ApiNode }): Promise<void> {
		const apiNode: Contracts.P2P.ApiNode = arguments_.apiNode;

		return this.#app.get<ApiNodeProcessor>(Identifiers.P2P.ApiNode.Processor).revalidateApiNode(apiNode);
	}
}
