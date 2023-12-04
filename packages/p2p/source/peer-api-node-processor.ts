import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class PeerApiNodeProcessor implements Contracts.P2P.PeerApiNodeProcessor {
	@inject(Identifiers.PeerApiNodeRepository)
	private readonly repository!: Contracts.P2P.PeerApiNodeRepository;

	@inject(Identifiers.PeerApiNodeVerifier)
	private readonly apiNodeVerifier!: Contracts.P2P.PeerApiNodeVerifier;

	readonly #apiNodes: Map<string, Contracts.P2P.PeerApiNode> = new Map<string, Contracts.P2P.PeerApiNode>();

	public getApiNodes(): Contracts.P2P.PeerApiNodes {
		return [...this.#apiNodes.values()];
	}

	public async validateAndAcceptApiNode(
		apiNode: Contracts.P2P.PeerApiNode,
		options: Contracts.P2P.AcceptNewPeerOptions = {},
	): Promise<void> {
		if (this.repository.hasApiNode(apiNode) || this.repository.hasPendingApiNode(apiNode)) {
			return;
		}

		this.repository.setPendingApiNode(apiNode);

		if (await this.apiNodeVerifier.verify(apiNode)) {
		}

		this.repository.forgetPendingApiNode(apiNode);
	}
}
