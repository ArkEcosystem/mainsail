import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class ApiNodeProcessor implements Contracts.P2P.ApiNodeProcessor {
	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly repository!: Contracts.P2P.ApiNodeRepository;

	@inject(Identifiers.P2P.ApiNode.Verifier)
	private readonly apiNodeVerifier!: Contracts.P2P.ApiNodeVerifier;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public async validateAndAcceptApiNode(
		apiNode: Contracts.P2P.ApiNode,
		options: Contracts.P2P.AcceptNewPeerOptions = {},
	): Promise<void> {
		if (this.repository.hasApiNode(apiNode) || this.repository.hasPendingApiNode(apiNode)) {
			return;
		}

		this.repository.setPendingApiNode(apiNode);

		if (await this.apiNodeVerifier.verify(apiNode)) {
			this.logger.debugExtra(`Accepted new API node ${apiNode.url}`);

			this.repository.setApiNode(apiNode);

			void this.events.dispatch(Events.ApiNodeEvent.Added, apiNode);
		}

		this.repository.forgetPendingApiNode(apiNode);
	}

	public async revalidateApiNode(apiNode: Contracts.P2P.ApiNode): Promise<void> {
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
		void this.events.dispatch(Events.ApiNodeEvent.Removed, apiNode);
	}
}
