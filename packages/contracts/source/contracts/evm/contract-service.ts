import { BigNumber } from "@mainsail/utils";

import { ValidatorWallet } from "../state/wallets.js";

export interface DeployerContract {
	readonly name: string;
	readonly address: string;
	readonly proxy?: "UUPS";
	readonly implementations: { address: string; abi: Record<string, any> }[];
	readonly activeImplementation?: string;
}

export interface Vote {
	validatorAddress: string;
	voterAddress: string;
}

export interface ValidatorRoundValidator {
	readonly voteBalance: BigNumber;
	readonly address: string;
}

export interface ValidatorRound {
	readonly round: number;
	readonly roundHeight: number;
	readonly validators: ValidatorRoundValidator[];
}

export interface ConsensusContractService {
	getRoundValidators(): Promise<ValidatorWallet[]>;
	getAllValidators(): Promise<ValidatorWallet[]>;
	getVotesCount(): Promise<number>;
	getVotes(): AsyncIterable<Vote>;
	getValidatorRounds(): AsyncIterable<ValidatorRound>;
}
