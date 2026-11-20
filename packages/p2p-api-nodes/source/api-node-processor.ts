import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import dayjs from "dayjs";

import { constants } from "./constants.js";

@injectable()
export class ApiNodeProcessor implements Contracts.P2PApiNodes.ApiNodeProcessor {
	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly apiNodeRepository!: Contracts.P2PApiNodes.ApiNodeRepository;

	@inject(Identifiers.P2P.ApiNode.Verifier)
	private readonly apiNodeVerifier!: Contracts.P2PApiNodes.ApiNodeVerifier;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	readonly #seedUrls = new Set<string>();

	public async validateAndAcceptApiNode(
		apiNode: Contracts.P2PApiNodes.ApiNode,
		options: Contracts.P2PApiNodes.AcceptNewApiNodeOptions = {},
	): Promise<void> {
		if (options.seed) {
			this.#seedUrls.add(apiNode.url);
		}

		if (this.apiNodeRepository.hasApiNode(apiNode) || this.apiNodeRepository.hasPendingApiNode(apiNode)) {
			return;
		}

		this.apiNodeRepository.setPendingApiNode(apiNode);

		if (await this.apiNodeVerifier.verify(apiNode, { seed: this.#isSeed(apiNode) })) {
			this.logger.debugExtra(`Accepted new API node ${apiNode.url}`, "p2p");

			this.apiNodeRepository.setApiNode(apiNode);

			void this.events.dispatch(Events.ApiNodeEvent.Added, apiNode);
		}

		this.apiNodeRepository.forgetPendingApiNode(apiNode);
	}

	public async revalidateApiNode(apiNode: Contracts.P2PApiNodes.ApiNode): Promise<void> {
		if (!this.apiNodeRepository.hasApiNode(apiNode)) {
			return;
		}

		if (
			apiNode.lastPinged &&
			apiNode.lastPinged.isAfter(dayjs().subtract(constants.REVALIDATE_AFTER_MINUTES, "minutes"))
		) {
			return;
		}

		if (await this.apiNodeVerifier.verify(apiNode, { seed: this.#isSeed(apiNode) })) {
			return;
		}

		this.apiNodeRepository.forgetApiNode(apiNode);
		void this.events.dispatch(Events.ApiNodeEvent.Removed, apiNode);
	}

	#isSeed(apiNode: Contracts.P2PApiNodes.ApiNode): boolean {
		return this.#seedUrls.has(apiNode.url);
	}
}
