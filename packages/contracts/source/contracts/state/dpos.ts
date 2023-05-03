import { IBlock } from "../crypto";
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

export interface DposPreviousRoundState {
	getAllValidators(): readonly Wallet[];
	getActiveValidators(): readonly Wallet[];
	getRoundValidators(): readonly Wallet[];
}

export type DposPreviousRoundStateProvider = (
	revertBlocks: IBlock[],
	roundInfo: RoundInfo,
) => Promise<DposPreviousRoundState>;
