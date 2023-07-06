import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Utils } from "@mainsail/kernel";

@injectable()
export class PeerDiscoverer implements Contracts.P2P.PeerDiscoverer {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerFactory)
	private readonly peerFactory!: Contracts.P2P.PeerFactory;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async discoverPeers(pingAll?: boolean): Promise<boolean> {
		const maxPeersPerPeer = 50;
		const ownPeers: Contracts.P2P.Peer[] = this.repository.getPeers();
		const theirPeers: Contracts.P2P.Peer[] = Object.values(
			(
				await Promise.all(
					Utils.shuffle(this.repository.getPeers())
						.slice(0, 8)
						.map(async (peer: Contracts.P2P.Peer) => {
							try {
								const hisPeers = await this.communicator.getPeers(peer);
								return hisPeers || [];
							} catch (error) {
								this.logger.debug(`Failed to get peers from ${peer.ip}: ${error.message}`);
								return [];
							}
						}),
				)
			)
				.map((peers) =>
					Object.fromEntries(
						Utils.shuffle(peers)
							.slice(0, maxPeersPerPeer)
							.map((current: Contracts.P2P.PeerBroadcast) => [current.ip, this.peerFactory(current.ip)]),
					),
				)
				.reduce(
					(accumulator: object, current: { [ip: string]: Contracts.P2P.Peer }) => ({
						...accumulator,
						...current,
					}),
					{},
				),
		);

		if (pingAll || !this.repository.hasMinimumPeers() || ownPeers.length < theirPeers.length * 0.75) {
			await Promise.all(
				theirPeers.map((p) =>
					this.app
						.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
						.call("validateAndAcceptPeer", { ip: p.ip, options: { lessVerbose: true } }),
				),
			);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.#pingPeerPorts(pingAll);

			return true;
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#pingPeerPorts();

		return false;
	}

	async populateSeedPeers(): Promise<any> {
		const peerList: Contracts.P2P.PeerData[] = this.app.config("peers").list;

		try {
			const peersFromUrl = await this.#loadPeersFromUrlList();
			for (const peer of peersFromUrl) {
				if (!peerList.find((p) => p.ip === peer.ip)) {
					peerList.push({
						ip: peer.ip,
						port: peer.port,
					});
				}
			}
		} catch {}

		if (!peerList || peerList.length === 0) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.app.terminate("No seed peers defined in peers.json");
		}

		const peers: Contracts.P2P.Peer[] = peerList.map((peer) => {
			const peerInstance = this.peerFactory(peer.ip);
			peerInstance.version = this.app.version();
			return peerInstance;
		});

		return Promise.all(
			// @ts-ignore
			Object.values(peers).map((peer: Contracts.P2P.Peer) => {
				// TODO: Check if this is ok
				this.repository.forgetPeer(peer);

				return this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("validateAndAcceptPeer", { ip: peer.ip, options: { lessVerbose: true, seed: true } });
			}),
		);
	}

	// TODO: Get from all sources
	async #loadPeersFromUrlList(): Promise<Array<{ ip: string; port: number }>> {
		const urls: string[] = this.app.config("peers").sources || [];

		for (const url of urls) {
			// Local File...
			if (url.startsWith("/")) {
				return require(url);
			}

			// URL...
			this.logger.debug(`GET ${url}`);
			const { data } = await Utils.http.get(url);
			return typeof data === "object" ? data : JSON.parse(data);
		}

		return [];
	}

	async #pingPeerPorts(pingAll?: boolean): Promise<void> {
		let peers = this.repository.getPeers();
		if (!pingAll) {
			peers = Utils.shuffle(peers).slice(0, Math.floor(peers.length / 2));
		}

		this.logger.debug(`Checking ports of ${Utils.pluralize("peer", peers.length, true)}.`);

		await Promise.all(peers.map((peer) => this.communicator.pingPorts(peer)));
	}
}
