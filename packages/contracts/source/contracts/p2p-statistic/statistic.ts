export interface StatisticService {
	boot(): void;
	dispose(): void;
	newRound(height: number, round: number): void;
	getCurrentRoundStatistic(): RoundStatistic;
	getRoundStatisticList(): string[];
	getRoundStatistic(id: string): RoundStatistic | undefined;
}

// What is known of one request once it is over: how long it took and whether it was answered properly.
export interface RequestStatistic {
	responseTime: number;
	success: boolean;
}

// The statistics of one consensus round. "Emits" are the requests we sent, "pings" the requests peers
// sent to us; the names are kept from @mainsail/p2p because the development API reports them.
export interface RoundStatistic {
	height: number;
	round: number;

	start(): void;
	stop(): void;
	addEmit(ip: string, endpoint: string, statistic: RequestStatistic): void;
	addPing(ip: string, endpoint: string, statistic: RequestStatistic): void;

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

export type GeneralStatistic = {
	duration: number;
	count: {
		peersTotal: number;
		peersBanned: number;
		peersRound: number;
		peersDropped: number;
		emitsSuccess: number;
		emitsFailed: number;
		pingsSuccess: number;
		pingsFailed: number;
		recordsUnattributed: number;
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
