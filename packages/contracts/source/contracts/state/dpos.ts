import { RoundInfo } from "../shared/rounds";
import { Wallet } from "./wallets";

export interface DposState {
	getRoundInfo(): RoundInfo;
	getAllValidators(): readonly Wallet[];
	getActiveValidators(): readonly Wallet[];
	getRoundValidators(): readonly Wallet[];
	buildVoteBalances(): void;
	buildValidatorRanking(): void;
	setValidatorsRound(roundInfo: RoundInfo): void;
}
