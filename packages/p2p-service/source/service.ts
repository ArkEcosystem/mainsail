import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { IpAddress, pluralize } from "@mainsail/utils";

import { percentile } from "./utils/index.js";

// Minimal port of the @mainsail/p2p service: seeds from peers.json and every peer that connects to us
// are accepted as they are. No discovery, verification, cleansing or API nodes yet.
@injectable()
export class Service implements Contracts.P2P.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: Contracts.P2P.PeerFactory;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public async boot(): Promise<void> {
		if (process.env[EnvironmentVariables.MAINSAIL_ENV] === "test") {
			this.logger.info("Skipping P2P service boot, because test environment is used", "p2p");

			return;
		}

		this.websocketService.onConnection = (connection) => this.#acceptPeer(connection.remoteAddress);
		await this.websocketService.boot();

		await this.#populateSeedPeers();

		this.logger.info(`Discovered ${pluralize("peer", this.repository.getPeers().length, true)}.`, "p2p");
	}

	public async dispose(): Promise<void> {
		this.websocketService.onConnection = undefined;
		await this.websocketService.dispose();
	}

	public getNetworkBlockNumberPercentile(p: number): number {
		// Headers are set by verification, which this package does not do yet; peers without one are skipped.
		const blockNumbers: number[] = [];
		for (const peer of this.repository.getPeers()) {
			try {
				blockNumbers.push(peer.header.blockNumber);
			} catch {}
		}

		return percentile(blockNumbers, p);
	}

	async #populateSeedPeers(): Promise<void> {
		const peerList = this.app.config<{ list: Contracts.P2P.PeerData[] }>("peers")?.list ?? [];

		if (peerList.length === 0) {
			await this.app.terminate("No seed peers defined in peers.json");
		}

		for (const { ip } of peerList) {
			this.#acceptPeer(ip);
		}
	}

	// Own and loopback addresses are skipped as in @mainsail/p2p; everything else is trusted for now.
	#acceptPeer(ip: string): void {
		if (!IpAddress.isValidPeerIp(ip) || this.repository.hasPeer(ip)) {
			return;
		}

		const peer = this.peerFactory(ip);
		peer.version = this.app.version();

		this.repository.setPeer(peer);
		this.logger.debug(`Accepted peer ${peer.ip}:${peer.port}`, "p2p");
	}
}
