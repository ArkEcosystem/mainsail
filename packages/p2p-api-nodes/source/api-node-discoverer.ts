import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError, shuffle } from "@mainsail/utils";
import dayjs from "dayjs";

import { constants } from "./constants.js";
import { isPublicHttpUrl } from "./utils/index.js";

@injectable()
export class ApiNodeDiscoverer implements Contracts.P2PApiNodes.ApiNodeDiscoverer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-api-nodes")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.ApiNode.Factory)
	private readonly apiNodeFactory!: Contracts.P2PApiNodes.ApiNodeFactory;

	@inject(Identifiers.P2P.ApiNode.Processor)
	private readonly apiNodeProcessor!: Contracts.P2PApiNodes.ApiNodeProcessor;

	@inject(Identifiers.P2P.ApiNode.Repository)
	private readonly apiNodeRepository!: Contracts.P2PApiNodes.ApiNodeRepository;

	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly peerCommunicator!: Contracts.P2PService.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	// Asks the active peer with this address; a peer that is not active (any more) is skipped. A peer that
	// fails to answer is the peer layer's business; here the failure is only logged.
	public async discoverApiNodes(ip: string): Promise<void> {
		if (!this.peerRepository.hasActivePeer(ip)) {
			return;
		}

		const peer = this.peerRepository.getActivePeer(ip);

		try {
			const { apiNodes } = await this.peerCommunicator.getApiNodes(peer);

			// The schema of the route bounds the answer, in the number of nodes and the length of a url.
			for (const { url } of apiNodes) {
				let apiNode: Contracts.P2PApiNodes.ApiNode;
				try {
					apiNode = this.apiNodeFactory(url);
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

	public async populateApiNodesFromConfiguration(): Promise<void> {
		const apiNodes: Contracts.P2PApiNodes.ApiNode[] = [];
		for (const url of this.configuration.getOptional<string[]>("apiNodes", [])) {
			try {
				apiNodes.push(this.apiNodeFactory(url));
			} catch (rawError) {
				this.logger.warn(`Skipping configured API node: ${ensureError(rawError).message}`, "p2p");
			}
		}

		await Promise.all(
			apiNodes.map((apiNode) => this.apiNodeProcessor.validateAndAcceptApiNode(apiNode, { seed: true })),
		);
	}

	public async discoverNewApiNodes(): Promise<void> {
		const peers = shuffle(this.peerRepository.getActivePeers()).slice(0, constants.PEERS_PER_CHECK);
		await Promise.all(peers.map((peer) => this.discoverApiNodes(peer.ip)));
	}

	public async refreshApiNodes(): Promise<void> {
		const pingedBefore = dayjs().subtract(constants.REVALIDATE_AFTER_MINUTES, "minutes");

		await Promise.all(
			this.apiNodeRepository
				.getApiNodes()
				// ignore nodes that were pinged recently
				.filter((apiNode) => !apiNode.lastPinged || apiNode.lastPinged.isBefore(pingedBefore))
				.map((apiNode) => this.apiNodeProcessor.revalidateApiNode(apiNode)),
		);
	}
}
