import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

import { ApiNodeProcessor } from "../api-node-processor.js";

export class ValidateAndAcceptApiNodeAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const apiNode: Contracts.P2P.ApiNode = arguments_.apiNode;
		const options: Contracts.P2P.AcceptNewPeerOptions = arguments_.options;

		return this.#app
			.get<ApiNodeProcessor>(Identifiers.P2P.ApiNode.Processor)
			.validateAndAcceptApiNode(apiNode, options);
	}
}
