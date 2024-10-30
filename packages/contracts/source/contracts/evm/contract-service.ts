import { ValidatorWallet } from "../state/wallets.js";

export interface Vote {
	validatorAddress: string;
	voterAddress: string;
}

export interface ValidatorRoundValidator {
	readonly voteBalance: bigint;
	readonly address: string;
}

export interface ValidatorRound {
	readonly round: number;
	readonly roundHeight: number;
	readonly validators: ValidatorRoundValidator[];
}

export interface ConsensusContractService {
	getActiveValidators(): Promise<ValidatorWallet[]>;
	getAllValidators(): Promise<ValidatorWallet[]>;
	getVotesCount(): Promise<number>;
	getVotes(): AsyncIterable<Vote>;
	getValidatorRounds(): Promise<ValidatorRound[]>;
}
