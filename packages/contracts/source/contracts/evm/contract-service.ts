import { ValidatorWallet } from "../state/wallets.js";

export interface Vote {
	validatorAddress: string;
	voterAddress: string;
}

export interface ConsensusContractService {
	getActiveValidators(): Promise<ValidatorWallet[]>;
	getAllValidators(): Promise<ValidatorWallet[]>;
	getVotesCount(): Promise<number>;
	getVotes(): AsyncIterable<Vote>;
}
