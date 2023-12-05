import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PeerApiNodeProcessor implements Contracts.P2P.PeerApiNodeProcessor {
	@inject(Identifiers.PeerApiNodeRepository)
	private readonly repository!: Contracts.P2P.PeerApiNodeRepository;

	@inject(Identifiers.PeerApiNodeVerifier)
	private readonly apiNodeVerifier!: Contracts.P2P.PeerApiNodeVerifier;

	@inject(Identifiers.P2PLogger)
	private readonly logger!: Contracts.P2P.Logger;

	public async validateAndAcceptApiNode(
		apiNode: Contracts.P2P.PeerApiNode,
		options: Contracts.P2P.AcceptNewPeerOptions = {},
	): Promise<void> {
		if (this.repository.hasApiNode(apiNode) || this.repository.hasPendingApiNode(apiNode)) {
			return;
		}

		this.repository.setPendingApiNode(apiNode);

		if (await this.apiNodeVerifier.verify(apiNode)) {
			this.logger.debugExtra(`Accepted new API node ${apiNode.ip}:${apiNode.port}`);

			this.repository.setApiNode(apiNode);
		}

		this.repository.forgetPendingApiNode(apiNode);
	}
}
