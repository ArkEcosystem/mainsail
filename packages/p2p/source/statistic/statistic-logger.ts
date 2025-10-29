import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";


const LOG_EXTRA_PEER_STATISTIC = true;

@injectable()
export class StatisticLogger implements Contracts.P2P.StatisticLogger {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public log(roundStatistic: Contracts.P2P.RoundStatistic): void {
		// General
		const generalStatistic = roundStatistic.getGeneralStatistic();
		this.logger.info(`Round statistics: ${JSON.stringify(generalStatistic)}`);

		// Endpoints
		const endpointStatistics = roundStatistic.getEndpointStatistics();
		let emitStatisticsLog = "Emit statistics by endpoint: \nname \tpeers success/emits\taverage\tmin[] max[]";
		for (const endpointStatistic of endpointStatistics) {
			emitStatisticsLog += `\n${endpointStatistic.endpoint}\t${endpointStatistic.count.peers}:${endpointStatistic.count.success}/${endpointStatistic.count.emits}\t${endpointStatistic.response.average}\t[${endpointStatistic.response.min}]\t[${endpointStatistic.response.max}]`;
		}

		if (emitStatisticsLog.length > 0) {
			this.logger.info(emitStatisticsLog);
		}

		// Peers
		const peerStatistics = roundStatistic.getPeerStatistics();
		let peerStatisticsLog = "Emit statistics by peer: \nip \tsuccess/emits\taverage\tmin[] max[]";
		for (const peerStatistic of peerStatistics) {
			peerStatisticsLog += `\n${peerStatistic.ip}\t${peerStatistic.count.success}/${peerStatistic.count.emits}\t${peerStatistic.response.average}\t[${peerStatistic.response.min}]\t[${peerStatistic.response.max}]`;

			if (LOG_EXTRA_PEER_STATISTIC) {
				for (const endpoint of peerStatistic.endpoints.sort((a, b) => b.responseTimes.length - a.responseTimes.length)) {
					peerStatisticsLog += `\n  ${endpoint.name}: [${endpoint.responseTimes}]`;
				}
			}
		}

		if (peerStatisticsLog.length > 0) {
			this.logger.info(peerStatisticsLog);
		}
	}
}
