import type { Contracts } from "@mainsail/contracts";

export interface ConsensusContractValidator {
	readonly addr: string;
	readonly data: {
		readonly voteBalance: bigint;
		readonly fee: bigint;
		readonly votersCount: bigint;
		readonly isResigned: boolean;
		readonly blsPublicKey: string;
	};
}

export const toValidatorWallet = ({
	addr: address,
	data: { blsPublicKey, fee, isResigned, voteBalance, votersCount },
}: ConsensusContractValidator): Contracts.State.ValidatorWallet => ({
	address,
	blsPublicKey: blsPublicKey.slice(2),
	fee,
	isResigned,
	voteBalance,
	votersCount: Number(votersCount),
});
