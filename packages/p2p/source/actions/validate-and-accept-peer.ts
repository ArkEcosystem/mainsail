import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import { PeerProcessor } from "../peer-processor.js";

export class ValidateAndAcceptPeerAction extends Services.Triggers.Action {
	#app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.#app = app;
	}

	public async execute(arguments_: { ip: string; options: Contracts.P2P.AcceptNewPeerOptions }): Promise<void> {
		const ip = arguments_.ip;
		const options = arguments_.options;

		return this.#app.get<PeerProcessor>(Identifiers.P2P.Peer.Processor).validateAndAcceptPeer(ip, options);
	}
}
