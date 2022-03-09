import { Transactions } from "@arkecosystem/crypto";
import { ITransaction } from "@arkecosystem/crypto/distribution/interfaces";

export const makeVoteTransactions = (length: number, voteAssets: string[]): Crypto.ITransaction[] => {
	const txs: Crypto.ITransaction[] = [];
	for (let index = 0; index < length; index++) {
		txs[index] = Transactions.BuilderFactory.vote().sign(Math.random().toString(36)).votesAsset(voteAssets).build();
	}
	return txs;
};
