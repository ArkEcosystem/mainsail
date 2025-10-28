export interface StatisticService {
	newRound(height: number, round: number): void;
}

export interface RoundStatistic {
	calculate(): void;
	log(): void;
}
