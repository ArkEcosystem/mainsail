import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { pluralize } from "@mainsail/utils";

import { percentile } from "./utils/index.js";

// Minimal port of the @mainsail/p2p service: seeds and every peer that connects to us are accepted as
// they are, and peers are discovered from the seeds once at boot. No verification, cleansing or API nodes yet.
@injectable()
export class Service implements Contracts.P2P.Service {
	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Processor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public async boot(): Promise<void> {
		if (process.env[EnvironmentVariables.MAINSAIL_ENV] === "test") {
			this.logger.info("Skipping P2P service boot, because test environment is used", "p2p");

			return;
		}

		this.websocketService.onConnection = (connection) =>
			void this.peerProcessor.validateAndAcceptPeer(connection.remoteAddress);
		await this.websocketService.boot();

		await this.peerDiscoverer.populateSeedPeers();

		// The old processor discovered peers from each newly accepted peer; this one only adds them, so ask the seeds here.
		await Promise.all(this.repository.getPeers().map((peer) => this.peerDiscoverer.discoverPeers(peer)));

		this.logger.info(`Discovered ${pluralize("peer", this.repository.getPeers().length, true)}.`, "p2p");
	}

	public async dispose(): Promise<void> {
		this.websocketService.onConnection = undefined;
		await this.websocketService.dispose();
	}

	public getNetworkBlockNumberPercentile(p: number): number {
		const blockNumbers = this.repository
			.getPeers()
			.filter((peer) => peer.header.blockNumber)
			.map((peer) => peer.header.blockNumber);

		return percentile(blockNumbers, p);
	}
}
