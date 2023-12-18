import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services, Utils } from "@mainsail/kernel";
import { randomNumber } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class PeerApiNodeDiscoverer implements Contracts.P2P.PeerApiNodeDiscoverer {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerApiNodeFactory)
	private readonly peerApiNodeFactory!: Contracts.P2P.PeerApiNodeFactory;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerApiNodeRepository)
	private readonly apiNodeRepository!: Contracts.P2P.PeerApiNodeRepository;

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async discoverApiNodes(peer: Contracts.P2P.Peer): Promise<void> {
		try {
			const { apiNodes } = await this.communicator.getApiNodes(peer);

			for (const apiNode of apiNodes) {
				await this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("validateAndAcceptApiNode", { apiNode, options: {} });
			}
		} catch (error) {
			this.logger.debug(`Failed to get api nodes from ${peer.ip}: ${error.message}`);
		}
	}

	async populateApiNodesFromConfiguration(): Promise<any> {
		const apiNodes = this.configuration.getOptional<string[]>("apiNodes", []).map((item) => {
			const [ip, port] = item.split(":");
			Utils.assert.defined<string>(ip);
			Utils.assert.defined<string>(port);

			return this.peerApiNodeFactory(ip, port);
		});

		return Promise.all(
			Object.values(apiNodes).map((apiNode: Contracts.P2P.PeerApiNode) =>
				this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("validateAndAcceptApiNode", { apiNode, options: { seed: true } }),
			),
		);
	}

	async discoverNewApiNodes(): Promise<any> {
		const peers = Utils.shuffle(this.peerRepository.getPeers()).slice(0, 5);
		return Promise.all(peers.map((peer) => this.discoverApiNodes(peer)));
	}

	async refreshApiNodes(): Promise<any> {
		return Promise.all(
			this.apiNodeRepository
				.getApiNodes()
				.filter((apiNode) =>
					// ignore nodes that were pinged recently
					(apiNode.lastPinged ?? dayjs()).isAfter(dayjs().add(randomNumber(10, 20), "minutes")),
				)
				.map((apiNode) =>
					this.app
						.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
						.call("revalidateApiNode", { apiNode }),
				),
		);
	}
}
