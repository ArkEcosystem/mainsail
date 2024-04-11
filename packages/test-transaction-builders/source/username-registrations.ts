import { Contracts } from "@mainsail/contracts";
import { UsernameRegistrationBuilder } from "@mainsail/crypto-transaction-username-registration";
import { BigNumber } from "@mainsail/utils";

import { Context, UsernameRegistrationOptions } from "./types.js";
import { makeUsernameResignation } from "./username-resignations.js";
import { buildSignedTransaction, getRandomFundedWallet, getRandomUsername } from "./utils.js";

export const makeUsernameRegistration = async (
	context: Context,
	options: UsernameRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee, username } = options;

	sender = sender ?? wallets[0];
	fee = fee ?? "2500000000";
	username = username ?? getRandomUsername();

	const builder = app.resolve(UsernameRegistrationBuilder).fee(BigNumber.make(fee).toFixed()).usernameAsset(username);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidUsernameRegistrationChange = async (
	context: Context,
	options: UsernameRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const registrationTx1 = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet });
	const registrationTx2 = makeUsernameRegistration(context, { nonceOffset: 1, sender: randomWallet });

	return Promise.all([registrationTx1, registrationTx2]);
};

export const makeUsernameRegistrationReusePreviouslyResigned = async (
	context: Context,
	options: UsernameRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet1 = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const username = "reuse";

	const registrationTx1 = makeUsernameRegistration(context, { nonceOffset: 0, sender: randomWallet1, username });
	const resignationTx = makeUsernameResignation(context, { nonceOffset: 1, sender: randomWallet1 });
	const registrationTx2 = makeUsernameRegistration(context, { sender: randomWallet2, username });

	return Promise.all([registrationTx1, resignationTx, registrationTx2]);
};

export const makeInvalidDuplicateUsernameRegistration = async (
	context: Context,
	options: UsernameRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet1 = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const username = options.username ?? "duplicate";

	const registrationTx1 = makeUsernameRegistration(context, { sender: randomWallet1, username });
	const registrationTx2 = makeUsernameRegistration(context, { sender: randomWallet2, username });

	return Promise.all([registrationTx1, registrationTx2]);
};
