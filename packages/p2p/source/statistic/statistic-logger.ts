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
		this.#logGeneralStatistic(roundStatistic);

		if (this.#verbosityLevel < 1) {
			return;
		}

		this.#logEndpointStatistics(roundStatistic);

		if (this.#verbosityLevel < 2) {
			return;
		}

		this.#logPeerStatistics(roundStatistic);
	}

	#logGeneralStatistic(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const generalStatistic = roundStatistic.getGeneralStatistic();

		const emitsTotal = generalStatistic.count.emitsSuccess + generalStatistic.count.emitsFailed;

		let output = "Round statistic:";
		output += ` duration=${generalStatistic.duration} ms`;
		output += ` peers=${generalStatistic.count.peersRound}/${generalStatistic.count.peersTotal}`;
		output += ` emits=${generalStatistic.count.emitsSuccess}/${emitsTotal}`;
		output += ` average=${generalStatistic.response.average} ms`;

		this.logger.info(output, "p2p");
	}

	#logEndpointStatistics(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const endpointStatistics = roundStatistic.getEndpointStatistics();

		if (endpointStatistics.length === 0) {
			return;
		}

		const NAME = "name";
		const PEERS = "peers";
		const RATE = "rate";
		const AVERAGE = "average";
		const MIN = "min[]";
		const MAX = "max[]";

		const maxNameWidth = Math.max(NAME.length, ...endpointStatistics.map(e => e.endpoint.length));
		const maxPeersWidth = Math.max(PEERS.length, ...endpointStatistics.map(e => e.count.peers.toString().length));
		const maxRateWidth = Math.max(RATE.length, ...endpointStatistics.map(e => `${e.count.success}/${e.count.emits}`.length));
		const maxAverageWidth = Math.max(AVERAGE.length, ...endpointStatistics.map(e => e.response.average.toString().length));
		const maxMinWidth = Math.max(MIN.length, ...endpointStatistics.map(e => `[${e.response.min}]`.length));
		const maxMaxWidth = Math.max(MAX.length, ...endpointStatistics.map(e => `[${e.response.max}]`.length));

		let emitStatisticsLog = "Emit statistics by endpoint:\n";
		emitStatisticsLog += `${NAME.padEnd(maxNameWidth)} ${PEERS.padEnd(maxPeersWidth)} ${RATE.padEnd(maxRateWidth)} ${AVERAGE.padEnd(maxAverageWidth)} ${MIN.padEnd(maxMinWidth)} ${MAX.padEnd(maxMaxWidth)}`;

		for (const endpointStatistic of endpointStatistics) {
			const peers = endpointStatistic.count.peers.toString();
			const rate = `${endpointStatistic.count.success}/${endpointStatistic.count.emits}`;
			const average = endpointStatistic.response.average.toString();
			const min = `[${endpointStatistic.response.min}]`;
			const max = `[${endpointStatistic.response.max}]`;

			emitStatisticsLog += `\n${endpointStatistic.endpoint.padEnd(maxNameWidth)} ${peers.padEnd(maxPeersWidth)} ${rate.padEnd(maxRateWidth)} ${average.padEnd(maxAverageWidth)} ${min.padEnd(maxMinWidth)} ${max.padEnd(maxMaxWidth)}`;
		}

		this.logger.info(emitStatisticsLog, "p2p");
	}

	#logPeerStatistics(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const peerStatistics = roundStatistic.getPeerStatistics();

		const IP = "ip";
		const RATE = "rate";
		const AVERAGE = "average";
		const MIN = "min";
		const MAX = "max";

		const maxIpWidth = Math.max(IP.length, ...peerStatistics.map(p => p.ip.length));
		const maxSuccessEmitsWidth = Math.max(RATE.length, ...peerStatistics.map(p => `${p.count.success}/${p.count.emits}`.length));
		const maxAverageWidth = Math.max(AVERAGE.length, ...peerStatistics.map(p => p.response.average.toString().length));
		const maxMinWidth = Math.max(MIN.length, ...peerStatistics.map(p => `[${p.response.min}]`.length));
		const maxMaxWidth = Math.max(MAX.length, ...peerStatistics.map(p => `[${p.response.max}]`.length));

		let peerStatisticsLog = "Statistics by peer:\n";
		peerStatisticsLog += `${IP.padEnd(maxIpWidth)} ${RATE.padEnd(maxSuccessEmitsWidth)} ${AVERAGE.padEnd(maxAverageWidth)} ${MIN.padEnd(maxMinWidth)} ${MAX.padEnd(maxMaxWidth)}`;

		for (const peerStatistic of peerStatistics) {
			const ip = peerStatistic.ip;
			const successEmits = `${peerStatistic.count.success}/${peerStatistic.count.emits}`;
			const average = peerStatistic.response.average.toString();
			const min = `[${peerStatistic.response.min}]`;
			const max = `[${peerStatistic.response.max}]`;

			peerStatisticsLog += `\n${ip.padEnd(maxIpWidth)} ${successEmits.padEnd(maxSuccessEmitsWidth)} ${average.padEnd(maxAverageWidth)} ${min.padEnd(maxMinWidth)} ${max.padEnd(maxMaxWidth)}`;

			if (this.#verbosityLevel >= 3) {
				for (const endpoint of peerStatistic.endpoints.sort((a, b) => b.responseTimes.length - a.responseTimes.length)) {
					peerStatisticsLog += `\n${endpoint.name}: [${endpoint.responseTimes}]`;
				}
				peerStatisticsLog += "\n";
			}
		}

		if (peerStatisticsLog.length > 0) {
			this.logger.info(peerStatisticsLog, "p2p");
		}
	}
}
