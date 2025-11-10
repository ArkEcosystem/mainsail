export interface StatisticService {
	boot(): void;
	newRound(height: number, round: number): void;
	getCurrentRoundStatistic(): RoundStatistic;
	getRoundStatisticList(): string[];
	getRoundStatistic(id: string): RoundStatistic | undefined;
}

export interface RoundStatistic {
	start(): void;
	stop(): void;
	addEmit(ip: string, endpoint: string, emitStatistic: EmitStatistic): void;
	addPing(ip: string, endpoint: string, pingStatistic: PingStatistic): void;

	peerAdded(ip: string): void;
	peerRemoved(ip: string): void;
	peerBanned(ip: string): void;

	getGeneralStatistic(): GeneralStatistic;
	getEmitStatistics(): EndpointStatistic[];
	getPingStatistics(): EndpointStatistic[];
	getPeerStatistics(): PeerStatistic[];
}

export interface StatisticLogger {
	log(roundStatistic: RoundStatistic): void;
}

export interface EmitStatistic {
	deserializeTime: number;
	responseTime: number;
	throttleTime: number;
	success: boolean;
}

export interface PingStatistic {
	responseTime: number;
	success: boolean;
}

export type GeneralStatistic = {
	duration: number;
	count: {
		peersTotal: number;
		peersBanned: number;
		peersRound: number;
		emitsSuccess: number;
		emitsFailed: number;
		pingsSuccess: number;
		pingsFailed: number;
	};
	response: {
		average: number;
	};
	peers: {
		added: string[];
		removed: string[];
		banned: string[];
	};
};

export type EndpointStatistic = {
	endpoint: string;
	count: {
		success: number;
		emits: number;
		peers: number;
	};
	response: {
		average: number;
		max: number[];
		min: number[];
	};
};

export type PeerSectionStatistic = {
	count: number;
	success: number;
	average: number;
	max: number[];
	min: number[];
	endpoints: {
		name: string;
		responseTimes: number[];
	}[];
};

export type PeerStatistic = {
	ip: string;
	emits: PeerSectionStatistic;
	pings: PeerSectionStatistic;
};
