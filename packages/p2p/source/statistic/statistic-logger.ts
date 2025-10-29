import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";


const LOG_EXTRA_PEER_STATISTIC = false;

@injectable()
export class StatisticLogger implements Contracts.P2P.StatisticLogger {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public log(roundStatistic: Contracts.P2P.RoundStatistic): void {
		this.#logGeneralStatistic(roundStatistic);
		this.#logEndpointStatistics(roundStatistic);
		this.#logPeerStatistics(roundStatistic);
	}

	#logGeneralStatistic(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const generalStatistic = roundStatistic.getGeneralStatistic();
		this.logger.info(`Round statistics: ${JSON.stringify(generalStatistic)}`);
	}

	#logEndpointStatistics(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const endpointStatistics = roundStatistic.getEndpointStatistics();

		if (endpointStatistics.length === 0) {
			return;
		}

		const NAME = "name";
		const PEERS_RATE = "peers success/emits";
		const AVERAGE = "average";
		const MIN = "min[]";
		const MAX = "max[]";

		const maxNameWidth = Math.max(NAME.length, ...endpointStatistics.map(e => e.endpoint.length));
		const maxPeersRateWidth = Math.max(PEERS_RATE.length, ...endpointStatistics.map(e => `${e.count.peers}:${e.count.success}/${e.count.emits}`.length));
		const maxAverageWidth = Math.max(AVERAGE.length, ...endpointStatistics.map(e => e.response.average.toString().length));
		const maxMinWidth = Math.max(MIN.length, ...endpointStatistics.map(e => `[${e.response.min}]`.length));
		const maxMaxWidth = Math.max(MAX.length, ...endpointStatistics.map(e => `[${e.response.max}]`.length));

		let emitStatisticsLog = "Emit statistics by endpoint:\n";
		emitStatisticsLog += `${NAME.padEnd(maxNameWidth)} ${PEERS_RATE.padEnd(maxPeersRateWidth)} ${AVERAGE.padEnd(maxAverageWidth)} ${MIN.padEnd(maxMinWidth)} ${MAX.padEnd(maxMaxWidth)}`;

		for (const endpointStatistic of endpointStatistics) {
			const peersRate = `${endpointStatistic.count.peers}:${endpointStatistic.count.success}/${endpointStatistic.count.emits}`;
			const min = `[${endpointStatistic.response.min}]`;
			const max = `[${endpointStatistic.response.max}]`;

			emitStatisticsLog += `\n${endpointStatistic.endpoint.padEnd(maxNameWidth)} ${peersRate.padEnd(maxPeersRateWidth)} ${endpointStatistic.response.average.toString().padEnd(maxAverageWidth)} ${min.padEnd(maxMinWidth)} ${max.padEnd(maxMaxWidth)}`;
		}

		this.logger.info(emitStatisticsLog);
	}

	#logPeerStatistics(roundStatistic: Contracts.P2P.RoundStatistic): void {
		const peerStatistics = roundStatistic.getPeerStatistics();

		const IP = "ip";
		const RATE = "rate";
		const AVERAGE = "avr";
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
			const successEmits = `${peerStatistic.count.success}/${peerStatistic.count.emits}`;
			const min = `[${peerStatistic.response.min}]`;
			const max = `[${peerStatistic.response.max}]`;

			peerStatisticsLog += `\n${peerStatistic.ip.padEnd(maxIpWidth)} ${successEmits.padEnd(maxSuccessEmitsWidth)} ${peerStatistic.response.average.toString().padEnd(maxAverageWidth)} ${min.padEnd(maxMinWidth)} ${max.padEnd(maxMaxWidth)}`;

			if (LOG_EXTRA_PEER_STATISTIC) {
				for (const endpoint of peerStatistic.endpoints.sort((a, b) => b.responseTimes.length - a.responseTimes.length)) {
					peerStatisticsLog += `\n${endpoint.name}: [${endpoint.responseTimes}]`;
				}
				peerStatisticsLog += "\n";
			}
		}

		if (peerStatisticsLog.length > 0) {
			this.logger.info(peerStatisticsLog);
		}
	}
}
