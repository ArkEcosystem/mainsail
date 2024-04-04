import { Contracts } from "@mainsail/contracts";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { BigNumber } from "@mainsail/utils";

import { Context, VoteOptions } from "./types.js";
import { buildSignedTransaction, getRandomFundedWallet } from "./utils.js";
import { makeValidatorRegistration } from "./validator-registrations.js";
import { makeValidatorResignation } from "./validator-resignations.js";

export const makeVote = async (
	{ sandbox, wallets }: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, voteAsset, unvoteAsset } = options;
	sender = sender ?? wallets[0];

	fee = fee ?? "100000000";

	let builder = app.resolve(VoteBuilder).fee(BigNumber.make(fee).toFixed());

	if (!voteAsset && !unvoteAsset) {
		voteAsset = wallets[1].publicKey;
	}

	if (voteAsset) {
		builder = builder.votesAsset([voteAsset]);
	}

	if (unvoteAsset) {
		builder = builder.unvotesAsset([unvoteAsset]);
	}

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidVote = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const voter = await getRandomFundedWallet(context);
	return makeVote(context, { sender: voter });
};

export const makeValidVoteAndUnvote = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const [validator1] = context.wallets;

	const voter = await getRandomFundedWallet(context);

	return Promise.all([
		makeVote(context, { ...options, nonceOffset: 0, sender: voter, voteAsset: validator1.publicKey }),
		makeVote(context, { ...options, nonceOffset: 1, sender: voter, unvoteAsset: validator1.publicKey }),
	]);
};

export const makeValidVoteSwitch = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const [validator1, validator2] = context.wallets;

	const voter = await getRandomFundedWallet(context);
	const voteTx = makeVote(context, { nonceOffset: 0, sender: voter, voteAsset: validator1.publicKey });

	// Unvote validator1 and vote for validator2
	const unvoteTx = makeVote(context, {
		nonceOffset: 1,
		sender: voter,
		unvoteAsset: validator1.publicKey,
		voteAsset: validator2.publicKey,
	});

	return Promise.all([voteTx, unvoteTx]);
};

export const makeUnvoteForResignedValidator = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const registrationTx = makeValidatorRegistration(context, { nonceOffset: 0, sender: randomWallet2 });
	const voteTx = makeVote(context, { nonceOffset: 0, sender: randomWallet, voteAsset: randomWallet2.publicKey });

	const resignationTx = makeValidatorResignation(context, { nonceOffset: 1, sender: randomWallet2 });
	const unvoteTx = makeVote(context, { nonceOffset: 1, sender: randomWallet, unvoteAsset: randomWallet2.publicKey });

	return Promise.all([registrationTx, voteTx, resignationTx, unvoteTx]);
};

export const makeInvalidVoteForNonValidator = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	return makeVote(context, { ...options, sender: randomWallet, voteAsset: randomWallet2.publicKey });
};

export const makeInvalidUnvoteForNonValidator = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const voter = await getRandomFundedWallet(context);
	const nonValidator = await getRandomFundedWallet(context);

	return makeVote(context, { ...options, sender: voter, unvoteAsset: nonValidator.publicKey });
};

export const makeInvalidVoteSwitchForNonVotedValidator = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const [validator1, validator2, validator3] = context.wallets;

	const voter = await getRandomFundedWallet(context);

	// Vote for validator1
	const voteTx = makeVote(context, { sender: voter, voteAsset: validator1.publicKey });

	// Provoke unvote mismatch by unvoting the non voted validator 2
	const unvoteTx = makeVote(context, {
		sender: voter,
		unvoteAsset: validator2.publicKey,
		voteAsset: validator3.publicKey,
	});

	return Promise.all([voteTx, unvoteTx]);
};

export const makeInvalidVoteForResignedValidator = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const registrationTx = makeValidatorRegistration(context, { nonceOffset: 0, sender: randomWallet2 });
	const resignationTx = makeValidatorResignation(context, { nonceOffset: 1, sender: randomWallet2 });
	const voteTx = makeVote(context, { sender: randomWallet, voteAsset: randomWallet2.publicKey });

	return Promise.all([registrationTx, resignationTx, voteTx]);
};

export const makeInvalidDoubleVote = async (
	context: Context,
	options: VoteOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const [validator1, validator2] = context.wallets;

	const voter = await getRandomFundedWallet(context);

	return Promise.all([
		makeVote(context, { ...options, nonceOffset: 0, sender: voter, voteAsset: validator1.publicKey }),
		makeVote(context, { ...options, nonceOffset: 1, sender: voter, voteAsset: validator2.publicKey }),
	]);
};
