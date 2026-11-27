import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { RoundStatistic } from "./round-statistic.js";

// A round is logged only if it lasted at least this share of the block time. A live round takes about
// a block time; the round of a block that was downloaded takes a moment, and a node that syncs a long
// chain would otherwise log a line for every block.
const LOGGED_ROUND_SHARE_OF_BLOCK_TIME = 0.3;

// Keeps one statistic per consensus round and the last rounds for the development API. It is fed from
// outside: the request timings come from the transport middleware of this package, the rest from the
// events of the peer layer and of consensus.
// The transport constructs that middleware, and with it this service, while it is itself being
// constructed. A round statistic needs the peer layer, which needs the transport, so the first one is
// made in boot() and not here: by then the transport exists.
@injectable()
export class Service implements Contracts.P2PStatistic.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-statistic")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.P2P.Statistic.Logger)
	private readonly statisticLogger!: Contracts.P2PStatistic.Logger;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	readonly #roundStatistics: Map<string, RoundStatistic> = new Map();
	#currentRoundStatistic!: RoundStatistic;

	readonly #listeners: Record<string, Contracts.Kernel.EventListener> = {
		[Events.ConsensusEvent.RoundStarted]: this.#listener<Contracts.Consensus.State>(({ blockNumber, round }) =>
			this.#newRound(blockNumber, round),
		),
		[Events.PeerEvent.Added]: this.#listener<{ ip: string }>(({ ip }) => this.#currentRoundStatistic.peerAdded(ip)),
		[Events.PeerEvent.Banned]: this.#listener<{ peer: { ip: string } }>(({ peer }) =>
			this.#currentRoundStatistic.peerBanned(peer.ip),
		),
		[Events.PeerEvent.Removed]: this.#listener<{ ip: string }>(({ ip }) =>
			this.#currentRoundStatistic.peerRemoved(ip),
		),
	};

	public boot(): void {
		// Start the first round statistic
		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
		this.#currentRoundStatistic.start();

		for (const [event, listener] of Object.entries(this.#listeners)) {
			this.events.listen(event, listener);
		}
	}

	public dispose(): void {
		for (const [event, listener] of Object.entries(this.#listeners)) {
			this.events.forget(event, listener);
		}
	}

	public getCurrentRoundStatistic(): RoundStatistic {
		return this.#currentRoundStatistic;
	}

	public getRoundStatisticList(): string[] {
		return [...this.#roundStatistics.keys()].reverse();
	}

	public getRoundStatistic(id: string): Contracts.P2PStatistic.RoundStatistic | undefined {
		return this.#roundStatistics.get(id);
	}

	// A statistic for the new round takes the place of the one that just ended, which is then logged.
	// The finished round is closed and written out last: if that fails, the new round is counted all the
	// same instead of being added to the old one.
	#newRound(height: number, round: number): void {
		const finishedRoundStatistic = this.#currentRoundStatistic;

		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
		this.#currentRoundStatistic.height = height;
		this.#currentRoundStatistic.round = round;
		this.#currentRoundStatistic.start();

		this.#roundStatistics.set(`${height}-${round}`, this.#currentRoundStatistic);
		// Remove the oldest one once more rounds are stored than configured
		if (this.#roundStatistics.size > this.configuration.getRequired<number>("maxTrackedRounds")) {
			const [firstKey] = this.#roundStatistics.keys();
			this.#roundStatistics.delete(firstKey);
		}

		finishedRoundStatistic.stop();

		if (this.#isWorthLogging(finishedRoundStatistic)) {
			this.statisticLogger.log(finishedRoundStatistic);
		}
	}

	#isWorthLogging(roundStatistic: RoundStatistic): boolean {
		const { blockTime } = this.cryptoConfiguration.getMilestone().timeouts;

		return roundStatistic.getGeneralStatistic().duration >= blockTime * LOGGED_ROUND_SHARE_OF_BLOCK_TIME;
	}

	// Consensus waits for the listeners of its round event and the peer layer does not catch what its
	// listeners throw, so a failure here must stay here: the statistics are never worth a round or the node.
	#listener<T>(record: (data: T) => void): Contracts.Kernel.EventListener {
		return {
			handle: async ({ data, name }): Promise<void> => {
				try {
					record(data as T);
				} catch (rawError) {
					this.logger.warn(
						`Recording ${name} in the statistics failed: ${ensureError(rawError).message}`,
						"p2p",
					);
				}
			},
		};
	}
}
