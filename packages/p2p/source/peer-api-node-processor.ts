import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";
import dayjs from "dayjs";

@injectable()
export class PeerApiNodeProcessor implements Contracts.P2P.PeerApiNodeProcessor {
	@inject(Identifiers.PeerApiNodeRepository)
	private readonly repository!: Contracts.P2P.PeerApiNodeRepository;

	@inject(Identifiers.PeerApiNodeVerifier)
	private readonly apiNodeVerifier!: Contracts.P2P.PeerApiNodeVerifier;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

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

			void this.events.dispatch(Enums.ApiNodeEvent.Added, apiNode);
		}

		this.repository.forgetPendingApiNode(apiNode);
	}

	public async revalidateApiNode(
		apiNode: Contracts.P2P.PeerApiNode,
	): Promise<void> {
		if (!this.repository.hasApiNode(apiNode)) {
			return;
		}

		const lastPinged = apiNode.lastPinged ?? dayjs();
		if (lastPinged.isBefore(dayjs().subtract(10, "minutes"))) {
			return;
		}

		if (await this.apiNodeVerifier.verify(apiNode)) {
			return;
		}

		this.repository.forgetApiNode(apiNode);
		void this.events.dispatch(Enums.ApiNodeEvent.Removed, apiNode);
	}
}
