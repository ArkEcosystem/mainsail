import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError, shuffle } from "@mainsail/utils";
import dayjs from "dayjs";

import { isPublicHttpUrl } from "./validation/index.js";

@injectable()
export class ApiNodeDiscoverer implements Contracts.P2P.ApiNodeDiscoverer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.ApiNode.Factory)
	private readonly ApiNodeFactory!: Contracts.P2P.ApiNodeFactory;

	@inject(Identifiers.P2P.ApiNode.Processor)
	private readonly apiNodeProcessor!: Contracts.P2P.ApiNodeProcessor;

	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly apiNodeRepository!: Contracts.P2P.ApiNodeRepository;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	async discoverApiNodes(peer: Contracts.P2P.Peer): Promise<void> {
		try {
			const { apiNodes } = await this.communicator.getApiNodes(peer);

			for (const { url } of apiNodes) {
				let apiNode: Contracts.P2P.ApiNode;
				try {
					apiNode = this.ApiNodeFactory(url);
				} catch {
					this.logger.debug(`Ignoring invalid API node url ${url} from ${peer.ip}`, "p2p");
					continue;
				}

				if (!isPublicHttpUrl(apiNode.url)) {
					this.logger.debug(`Ignoring non-public API node url ${url} from ${peer.ip}`, "p2p");
					continue;
				}

				await this.apiNodeProcessor.validateAndAcceptApiNode(apiNode, {});
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Failed to get api nodes from ${peer.ip}: ${error.message}`, "p2p");
		}
	}

	async populateApiNodesFromConfiguration(): Promise<void> {
		const apiNodes: Contracts.P2P.ApiNode[] = [];
		for (const url of this.configuration.getOptional<string[]>("apiNodes", [])) {
			try {
				apiNodes.push(this.ApiNodeFactory(url));
			} catch (rawError) {
				this.logger.warn(`Skipping configured API node: ${ensureError(rawError).message}`, "p2p");
			}
		}

		await Promise.all(
			apiNodes.map((apiNode) => this.apiNodeProcessor.validateAndAcceptApiNode(apiNode, { seed: true })),
		);
	}

	async discoverNewApiNodes(): Promise<void> {
		const peers = shuffle(this.peerRepository.getPeers()).slice(0, 5);
		await Promise.all(peers.map((peer) => this.discoverApiNodes(peer)));
	}

	async refreshApiNodes(): Promise<void> {
		await Promise.all(
			this.apiNodeRepository
				.getApiNodes()
				.filter(
					// ignore nodes that were pinged recently
					(apiNode) => !apiNode.lastPinged || apiNode.lastPinged.isBefore(dayjs().subtract(10, "minutes")),
				)
				.map((apiNode) => this.apiNodeProcessor.revalidateApiNode(apiNode)),
		);
	}
}
