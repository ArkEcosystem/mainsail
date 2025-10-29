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
	addEmit(ip: string, endpoint: string, emitStatistic: EmitStatistic): void;


	getGeneralStatistic(): GeneralStatistic;
	getEndpointStatistics(): EndpointStatistic[];
	getPeerStatistics(): PeerStatistic[];
}


export type GeneralStatistic = {
	duration: number;
	roundPeersCount: number;
	roundEmitCount: number;
};

export type EndpointStatistic = {
	endpoint: string;
	count: {
		success: number;
		emits: number;
		peers: number;
	},
	response: {
		average: number;
		max: number[];
		min: number[];
	}
}

export type PeerStatistic = {
	ip: string;
	count: {
		success: number;
		emits: number;
	},
	response: {
		average: number;
		max: number[];
		min: number[];
	}
	endpoints: {
		name: string;
		responseTimes: number[];
	}[];
}
