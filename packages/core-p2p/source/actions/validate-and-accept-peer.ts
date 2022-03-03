import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { PeerProcessor } from "../peer-processor";

export class ValidateAndAcceptPeerAction extends Services.Triggers.Action {
	private app: Contracts.Kernel.Application;

	public constructor(app: Contracts.Kernel.Application) {
		super();
		this.app = app;
	}

	public async execute(arguments_: Types.ActionArguments): Promise<void> {
		const peer: Contracts.P2P.Peer = arguments_.peer;
		const options: Contracts.P2P.AcceptNewPeerOptions = arguments_.options;

		return this.app.get<PeerProcessor>(Identifiers.PeerProcessor).validateAndAcceptPeer(peer, options);
	}
}
