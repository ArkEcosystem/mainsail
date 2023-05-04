import { Contracts } from "@mainsail/contracts";
import { VoteBuilder } from "../../crypto-transaction-vote";

export const makeVoteTransactions = async (
	voteBuilder: VoteBuilder,
	length: number,
	voteAssets: string[],
): Promise<Contracts.Crypto.ITransaction[]> => {
	const txs: Contracts.Crypto.ITransaction[] = [];
	for (let index = 0; index < length; index++) {
		txs[index] = await (await voteBuilder.votesAsset(voteAssets).sign(Math.random().toString(36))).build();
	}
	return txs;
};
