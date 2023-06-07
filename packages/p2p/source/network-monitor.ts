import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services, Utils } from "@mainsail/kernel";
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

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerFactory)
	private readonly peerFactory!: Contracts.P2P.PeerFactory;

	@inject(Identifiers.PeerProcessor)
	private readonly processor!: Contracts.P2P.PeerProcessor;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public config: any;
	public nextUpdateNetworkStatusScheduled: boolean | undefined;

	#coldStart = false;
	#initializing = true;

	@postConstruct()
	public initialize(): void {
		this.config = this.configuration.all(); // >_<
	}

	public async boot(): Promise<void> {
		await this.#populateSeedPeers();

		if (this.config.skipDiscovery) {
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

		if (this.config.networkStart) {
			this.#coldStart = true;
			this.logger.warning("Entering cold start because the relay is in genesis-start mode.");
		}

		if (this.config.disableDiscovery) {
			this.logger.warning("Skipped peer discovery because the relay is in non-discovery mode.");
			return;
		}

		try {
			if (await this.discoverPeers(initialRun)) {
				await this.cleansePeers();
			}
		} catch (error) {
			this.logger.error(`Network Status: ${error.message}`);
		}

		let nextRunDelaySeconds = 600;

		if (!this.#hasMinimumPeers()) {
			await this.#populateSeedPeers();

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
		const pingDelay = fast ? 1500 : this.config.verifyTimeout;

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

		if (pingAll || !this.#hasMinimumPeers() || ownPeers.length < theirPeers.length * 0.75) {
			await Promise.all(
				theirPeers.map((p) =>
					this.app
						.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
						.call("validateAndAcceptPeer", { options: { lessVerbose: true }, peer: p }),
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

	public isColdStart(): boolean {
		return this.#coldStart;
	}

	public completeColdStart(): void {
		this.#coldStart = false;
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
		await this.discoverPeers(true);
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

	async #pingPeerPorts(pingAll?: boolean): Promise<void> {
		let peers = this.repository.getPeers();
		if (!pingAll) {
			peers = Utils.shuffle(peers).slice(0, Math.floor(peers.length / 2));
		}

		this.logger.debug(`Checking ports of ${Utils.pluralize("peer", peers.length, true)}.`);

		await Promise.all(peers.map((peer) => this.communicator.pingPorts(peer)));
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

	#hasMinimumPeers(): boolean {
		if (this.config.ignoreMinimumNetworkReach) {
			this.logger.warning("Ignored the minimum network reach because the relay is in seed mode.");

			return true;
		}

		return Object.keys(this.repository.getPeers()).length >= this.config.minimumNetworkReach;
	}

	async #populateSeedPeers(): Promise<any> {
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
				this.repository.forgetPeer(peer);

				return this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("validateAndAcceptPeer", { options: { lessVerbose: true, seed: true }, peer });
			}),
		);
	}

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
}
