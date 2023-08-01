import { inject, injectable, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import delay from "delay";

import { NetworkState } from "./network-state";

// @TODO review the implementation
@injectable()
export class NetworkMonitor implements Contracts.P2P.NetworkMonitor {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

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

	public nextUpdateNetworkStatusScheduled: boolean | undefined;

	#initializing = true;

	public async boot(): Promise<void> {
		await this.peerDiscoverer.populateSeedPeers();

		if (this.configuration.getOptional("skipDiscovery", false)) {
			this.logger.warning("Skipped peer discovery because the relay is in skip-discovery mode.");
		} else {
			await this.updateNetworkStatus(true);

			for (const [version, peers] of Object.entries(
				// @ts-ignore
				Utils.groupBy(this.repository.getPeers(), (peer) => peer.version),
			)) {
				this.logger.info(`Discovered ${Utils.pluralize("peer", peers.length, true)} with v${version}.`);
			}
		}

		// Give time to cooldown rate limits after peer verifier finished.
		await Utils.sleep(1000);

		this.#initializing = false;
	}

	public async updateNetworkStatus(initialRun?: boolean): Promise<void> {
		if (process.env[Constants.Flags.CORE_ENV] === "test") {
			return;
		}

		if (this.configuration.getOptional("disableDiscovery", false)) {
			this.logger.warning("Skipped peer discovery because the relay is in non-discovery mode.");
			return;
		}

		try {
			if (await this.peerDiscoverer.discoverPeers(initialRun)) {
				await this.cleansePeers();
			}
		} catch (error) {
			this.logger.error(`Network Status: ${error.message}`);
		}

		let nextRunDelaySeconds = 600;

		if (!this.repository.hasMinimumPeers()) {
			await this.peerDiscoverer.populateSeedPeers();

			nextRunDelaySeconds = 60;

			this.logger.info(`Couldn't find enough peers. Falling back to seed peers.`);
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#scheduleUpdateNetworkStatus(nextRunDelaySeconds);
	}

	public async cleansePeers({
		fast = false,
		forcePing = false,
		peerCount,
	}: { fast?: boolean; forcePing?: boolean; peerCount?: number } = {}): Promise<void> {
		let peers = this.repository.getPeers();
		let max = peers.length;

		let unresponsivePeers = 0;
		const pingDelay = fast ? 1500 : this.configuration.getRequired<number>("verifyTimeout");

		if (peerCount) {
			peers = Utils.shuffle(peers).slice(0, peerCount);
			max = Math.min(peers.length, peerCount);
		}

		this.logger.info(`Checking ${Utils.pluralize("peer", max, true)}`);
		const peerErrors = {};

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

		for (const key of Object.keys(peerErrors)) {
			const peerCount = peerErrors[key].length;
			this.logger.debug(`Removed ${Utils.pluralize("peer", peerCount, true)} because of "${key}"`);
		}

		if (this.#initializing) {
			this.logger.info(
				`${max - unresponsivePeers} of ${Utils.pluralize("peer", max, true)} on the network are responsive`,
			);
			this.logger.info(`Median Network Height: ${this.getNetworkHeight().toLocaleString()}`);
		}
	}

	public getNetworkHeight(): number {
		const medians = this.repository
			.getPeers()
			.filter((peer) => peer.state.height)
			.map((peer) => peer.state.height)
			.sort((a, b) => {
				Utils.assert.defined<string>(a);
				Utils.assert.defined<string>(b);

				return a - b;
			});

		return medians[Math.floor(medians.length / 2)] || 0;
	}

	public async getNetworkState(): Promise<Contracts.P2P.NetworkState> {
		await this.cleansePeers({ fast: true, forcePing: true });

		return await NetworkState.analyze(this, this.repository);
	}

	async #scheduleUpdateNetworkStatus(nextUpdateInSeconds): Promise<void> {
		if (this.nextUpdateNetworkStatusScheduled) {
			return;
		}

		this.nextUpdateNetworkStatusScheduled = true;

		await Utils.sleep(nextUpdateInSeconds * 1000);

		this.nextUpdateNetworkStatusScheduled = false;

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.updateNetworkStatus();
	}
}
