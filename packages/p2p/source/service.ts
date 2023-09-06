import { inject, injectable, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import delay from "delay";

@injectable()
export class Service implements Contracts.P2P.Service {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.PeerDiscoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.PeerVerifier)
	private readonly peerVerifier!: Contracts.P2P.PeerVerifier;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async boot(): Promise<void> {
		if (process.env[Constants.Flags.CORE_ENV] === "test") {
			this.logger.info("Skipping P2P service boot, because test environment is used");

			return;
		}

		await this.peerDiscoverer.populateSeedPeers();
		await this.peerDiscoverer.discoverPeers(true);

		for (const [version, peers] of Object.entries(
			Utils.groupBy(this.repository.getPeers(), (peer) => peer.version),
		)) {
			this.logger.info(`Discovered ${Utils.pluralize("peer", peers.length, true)} with v${version}.`);
		}

		void this.mainLoop();
	}

	public async mainLoop(): Promise<void> {
		while (true) {
			await this.#checkMinPeers();
			await this.#checkReceivedMessages();

			await Utils.sleep(1000);
		}
	}

	async #checkMinPeers(): Promise<void> {
		if (!this.repository.hasMinimumPeers()) {
			this.logger.info(`Couldn't find enough peers. Falling back to seed peers.`);

			await this.peerDiscoverer.populateSeedPeers();
			await this.peerDiscoverer.discoverPeers(true);
		}
	}

	async #checkReceivedMessages(): Promise<void> {
		if (this.state.shouldCleansePeers()) {
			await this.cleansePeers({
				fast: true,
				peerCount: Math.max(this.repository.getPeers().length * 0.2, 5),
			});
		}
	}

	public async cleansePeers({ fast = false, peerCount }: { fast?: boolean; peerCount?: number } = {}): Promise<void> {
		let peers = this.repository.getPeers();
		let max = peers.length;

		let unresponsivePeers = 0;
		const pingDelay = fast ? 1500 : this.configuration.getRequired<number>("verifyTimeout");

		if (peerCount) {
			peers = Utils.shuffle(peers).slice(0, peerCount);
			max = Math.min(peers.length, peerCount);
		}

		this.logger.info(`Checking ${Utils.pluralize("peer", max, true)}`);

		// we use Promise.race to cut loose in case some communicator.ping() does not resolve within the delay
		// in that case we want to keep on with our program execution while ping promises can finish in the background
		await new Promise<void>(async (resolve) => {
			let isResolved = false;

			// Simulates Promise.race, but doesn't cause "multipleResolvers" process error
			const resolvesFirst = () => {
				if (!isResolved) {
					isResolved = true;
					resolve();
				}
			};

			await Promise.all(
				peers.map(async (peer) => {
					if (!(await this.peerVerifier.verify(peer))) {
						unresponsivePeers++;

						this.peerDisposer.disposePeer(peer);
					}
				}),
			).then(resolvesFirst);

			await delay(pingDelay).finally(resolvesFirst);
		});

		if (unresponsivePeers > 0) {
			this.logger.debug(`Removed ${Utils.pluralize("peer", unresponsivePeers, true)}`);
		}
	}

	public getNetworkHeight(): number {
		const medians = this.repository
			.getPeers()
			.filter((peer) => peer.header.height)
			.map((peer) => peer.header.height)
			.sort((a, b) => {
				Utils.assert.defined<string>(a);
				Utils.assert.defined<string>(b);

				return a - b;
			});

		return medians[Math.floor(medians.length / 2)] || 0;
	}
}
