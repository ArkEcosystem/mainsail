import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class StatisticLogger implements Contracts.P2P.StatisticLogger {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	#verbosityLevel = 0;

	@postConstruct()
	public init(): void {
		this.#verbosityLevel = this.configuration.getRequired<number>("statistic.verbosity");
	}

	public log(roundStatistic: Contracts.P2P.RoundStatistic): void {
		// Level 0: General statistic
		const generalStatistic = roundStatistic.getGeneralStatistic();
		this.#logGeneralStatistic(generalStatistic);

		if (this.#verbosityLevel < 1) {
			return;
		}

		// Level 1: Endpoint statistics
		const emitStatistics = roundStatistic.getEmitStatistics();
		this.#logEndpointStatistics(emitStatistics, "Emit statistics by endpoint");

		const pingStatistics = roundStatistic.getPingStatistics();
		this.#logEndpointStatistics(pingStatistics, "Ping statistics by endpoint");

		if (this.#verbosityLevel < 2) {
			return;
		}

		// Level 2: Peer statistics
		const peerStatistics = roundStatistic.getPeerStatistics();
		this.#logPeerStatistics(generalStatistic, peerStatistics);
	}

	#logGeneralStatistic(generalStatistic: Contracts.P2P.GeneralStatistic): void {
		const emitsTotal = generalStatistic.count.emitsSuccess + generalStatistic.count.emitsFailed;
		const pingsTotal = generalStatistic.count.pingsSuccess + generalStatistic.count.pingsFailed;

		let log = "Round statistic:";
		log += ` duration=${generalStatistic.duration} ms`;
		log += ` peers=${generalStatistic.count.peersRound}/${generalStatistic.count.peersTotal} (+${generalStatistic.peers.added.length}/-${generalStatistic.peers.removed.length})`;
		log += ` ban=${generalStatistic.peers.banned.length}/${generalStatistic.count.peersBanned}`;
		log += ` emits=${generalStatistic.count.emitsSuccess}/${emitsTotal}`;
		log += ` pings=${generalStatistic.count.pingsSuccess}/${pingsTotal}`;
		log += ` average=${generalStatistic.response.average} ms`;

		this.logger.info(log, "p2p");
	}

	#logEndpointStatistics(endpointStatistics: Contracts.P2P.EndpointStatistic[], header: string): void {
		if (endpointStatistics.length === 0) {
			return;
		}

		const NAME = "name";
		const PEERS = "peers";
		const RATE = "rate";
		const AVERAGE = "average";
		const MIN = "min[]";
		const MAX = "max[]";

		const maxNameWidth = Math.max(NAME.length, ...endpointStatistics.map((e) => e.endpoint.length));
		const maxPeersWidth = Math.max(PEERS.length, ...endpointStatistics.map((e) => e.count.peers.toString().length));
		const maxRateWidth = Math.max(
			RATE.length,
			...endpointStatistics.map((e) => `${e.count.success}/${e.count.emits}`.length),
		);
		const maxAverageWidth = Math.max(
			AVERAGE.length,
			...endpointStatistics.map((e) => e.response.average.toString().length),
		);
		const maxMinWidth = Math.max(MIN.length, ...endpointStatistics.map((e) => `[${e.response.min}]`.length));
		const maxMaxWidth = Math.max(MAX.length, ...endpointStatistics.map((e) => `[${e.response.max}]`.length));

		let log = `${header}:\n`;
		log += `${NAME.padEnd(maxNameWidth)} ${PEERS.padEnd(maxPeersWidth)} ${RATE.padEnd(maxRateWidth)} ${AVERAGE.padEnd(maxAverageWidth)} ${MIN.padEnd(maxMinWidth)} ${MAX.padEnd(maxMaxWidth)}`;

		for (const endpointStatistic of endpointStatistics) {
			const peers = endpointStatistic.count.peers.toString();
			const rate = `${endpointStatistic.count.success}/${endpointStatistic.count.emits}`;
			const average = endpointStatistic.response.average.toString();
			const min = `[${endpointStatistic.response.min}]`;
			const max = `[${endpointStatistic.response.max}]`;

			log += `\n${endpointStatistic.endpoint.padEnd(maxNameWidth)} ${peers.padEnd(maxPeersWidth)} ${rate.padEnd(maxRateWidth)} ${average.padEnd(maxAverageWidth)} ${min.padEnd(maxMinWidth)} ${max.padEnd(maxMaxWidth)}`;
		}

		this.logger.info(log, "p2p");
	}

	#logPeerStatistics(
		generalStatistic: Contracts.P2P.GeneralStatistic,
		peerStatistics: Contracts.P2P.PeerStatistic[],
	): void {
		// Calculate padding lengths
		const IP = "ip";
		const EMITS = "emits";
		const PINGS = "pings";
		const AVERAGE = "average";
		const MIN = "min";
		const MAX = "max";

		const ipPad = Math.max(IP.length, ...peerStatistics.map((p) => p.ip.length));

		const emitsPad = {
			average: Math.max(AVERAGE.length, ...peerStatistics.map((p) => p.emits.average.toString().length)),
			emits: Math.max(EMITS.length, ...peerStatistics.map((p) => `${p.emits.success}/${p.emits.count}`.length)),
			max: Math.max(MAX.length, ...peerStatistics.map((p) => `[${p.emits.max}]`.length)),
			min: Math.max(MIN.length, ...peerStatistics.map((p) => `[${p.emits.min}]`.length)),
		};

		const pingPad = {
			average: Math.max(AVERAGE.length, ...peerStatistics.map((p) => p.pings.average.toString().length)),
			max: Math.max(MAX.length, ...peerStatistics.map((p) => `[${p.pings.max}]`.length)),
			min: Math.max(MIN.length, ...peerStatistics.map((p) => `[${p.pings.min}]`.length)),
			pings: Math.max(PINGS.length, ...peerStatistics.map((p) => `${p.pings.success}/${p.pings.count}`.length)),
		};

		// Build log
		let log = "Statistics by peer:\n";

		log += this.#getPeersReport(generalStatistic);

		log += `${IP.padEnd(ipPad)}`;
		log += ` ${EMITS.padEnd(emitsPad.emits)} ${AVERAGE.padEnd(emitsPad.average)} ${MIN.padEnd(emitsPad.min)} ${MAX.padEnd(emitsPad.max)}`;
		log += ` ${PINGS.padEnd(pingPad.pings)} ${AVERAGE.padEnd(pingPad.average)} ${MIN.padEnd(pingPad.min)} ${MAX.padEnd(pingPad.max)}`;

		for (const peerStatistic of peerStatistics) {
			const ip = peerStatistic.ip;

			const successEmits = `${peerStatistic.emits.success}/${peerStatistic.emits.count}`;
			const averageEmits = peerStatistic.emits.average.toString();
			const minEmits = `[${peerStatistic.emits.min}]`;
			const maxEmits = `[${peerStatistic.emits.max}]`;

			const successPings = `${peerStatistic.pings.success}/${peerStatistic.pings.count}`;
			const averagePings = peerStatistic.pings.average.toString();
			const minPings = `[${peerStatistic.pings.min}]`;
			const maxPings = `[${peerStatistic.pings.max}]`;

			log += `\n${ip.padEnd(ipPad)}`;
			log += ` ${successEmits.padEnd(emitsPad.emits)} ${averageEmits.padEnd(emitsPad.average)} ${minEmits.padEnd(emitsPad.min)} ${maxEmits.padEnd(emitsPad.max)}`;
			log += ` ${successPings.padEnd(pingPad.pings)} ${averagePings.padEnd(pingPad.average)} ${minPings.padEnd(pingPad.min)} ${maxPings.padEnd(pingPad.max)}`;

			log += this.#getEndpointResponseTimes(peerStatistic);
		}

		this.logger.info(log, "p2p");
	}

	#getPeersReport(generalStatistic: Contracts.P2P.GeneralStatistic): string {
		let log = "";

		if (generalStatistic.peers.added.length > 0) {
			log += `Added: ${generalStatistic.peers.added.join(", ")}\n`;
		}

		if (generalStatistic.peers.removed.length > 0) {
			log += `Removed: ${generalStatistic.peers.removed.join(", ")}\n`;
		}

		if (generalStatistic.peers.banned.length > 0) {
			log += `Banned: ${generalStatistic.peers.banned.join(", ")}\n`;
		}

		return log;
	}

	#getEndpointResponseTimes(peerStatistic: Contracts.P2P.PeerStatistic): string {
		let log = "";

		// Level 3: Emit endpoints response times
		if (this.#verbosityLevel >= 3) {
			for (const endpoint of peerStatistic.emits.endpoints) {
				const endpointName = `${endpoint.name}:`.padEnd(14);
				log += `\nE: ${endpointName} [${endpoint.responseTimes}]`;
			}

			if (peerStatistic.emits.endpoints.length > 0) {
				log += "\n";
			}

			for (const endpoint of peerStatistic.pings.endpoints) {
				const endpointName = `${endpoint.name}:`.padEnd(14);
				log += `\nP: ${endpointName} [${endpoint.responseTimes}]`;
			}
			log += "\n";
		}

		return log;
	}
}
