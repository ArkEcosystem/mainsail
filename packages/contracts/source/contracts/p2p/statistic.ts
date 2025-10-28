export interface StatisticService {
	newRound(height: number, round: number): void;
	getCurrentRoundStatistic(): RoundStatistic;
}

export interface EmitStatistic {
	deserializeTime: number;
	responseTime: number;
	throttleTime: number;
	success: boolean;
}

export interface RoundStatistic {
	calculate(): void;
	log(): void;
	addPeerResponseTime(ip: string, endpoint: string, emitStatistic: EmitStatistic): void;
}
