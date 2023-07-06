import { inject, injectable, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import delay from "delay";

import { NetworkState } from "./network-state";
import { PeerCommunicator } from "./peer-communicator";

// @TODO review the implementation
@injectable()
export class NetworkMonitor implements Contracts.P2P.NetworkMonitor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerDiscoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerProcessor)
	private readonly processor!: Contracts.P2P.PeerProcessor;

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
					try {
						await this.communicator.ping(peer, pingDelay, forcePing);
					} catch (error) {
						unresponsivePeers++;

						peerErrors[error] = peerErrors[error] || [];
						peerErrors[error].push(peer);

						await this.processor.dispose(peer);
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

	public async refreshPeersAfterFork(): Promise<void> {
		this.logger.info(`Refreshing ${Utils.pluralize("peer", this.repository.getPeers().length, true)} after fork.`);

		await this.cleansePeers({ forcePing: true });
	}

	public async checkNetworkHealth(): Promise<Contracts.P2P.NetworkStatus> {
		await this.peerDiscoverer.discoverPeers(true);
		await this.cleansePeers({ forcePing: true });

		const lastBlock: Contracts.Crypto.IBlock = this.app
			.get<Contracts.State.StateStore>(Identifiers.StateStore)
			.getLastBlock();

		// @ts-ignore
		const verificationResults: Contracts.P2P.PeerVerificationResult[] = this.repository
			.getPeers()
			.filter((peer) => peer.verificationResult)
			.map((peer) => peer.verificationResult);

		if (verificationResults.length === 0) {
			this.logger.info("No verified peers available.");

			return { forked: false };
		}

		const forkVerificationResults: Contracts.P2P.PeerVerificationResult[] = verificationResults.filter(
			(verificationResult: Contracts.P2P.PeerVerificationResult) => verificationResult.forked,
		);

		const forkHeights: number[] = forkVerificationResults
			.map((verificationResult: Contracts.P2P.PeerVerificationResult) => verificationResult.highestCommonHeight)
			.filter((forkHeight, index, array) => array.indexOf(forkHeight) === index) // unique
			.sort()
			.reverse();

		for (const forkHeight of forkHeights) {
			const forkPeerCount = forkVerificationResults.filter((vr) => vr.highestCommonHeight === forkHeight).length;
			const ourPeerCount = verificationResults.filter((vr) => vr.highestCommonHeight > forkHeight).length + 1;

			if (forkPeerCount > ourPeerCount) {
				const blocksToRollback = lastBlock.data.height - forkHeight;

				if (blocksToRollback > 5000) {
					this.logger.info(
						`Rolling back 5000/${blocksToRollback} blocks to fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`,
					);

					return { blocksToRollback: 5000, forked: true };
				} else {
					this.logger.info(
						`Rolling back ${blocksToRollback} blocks to fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`,
					);

					return { blocksToRollback, forked: true };
				}
			} else {
				this.logger.debug(`Ignoring fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`);
			}
		}

		return { forked: false };
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
