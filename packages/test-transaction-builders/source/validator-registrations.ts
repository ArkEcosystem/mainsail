import { Contracts } from "@mainsail/contracts";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { BigNumber } from "@mainsail/utils";

import { Context, ValidatorRegistrationOptions } from "./types.js";
import { buildSignedTransaction, getRandomConsensusKeyPair, getRandomFundedWallet } from "./utils.js";

export const makeValidatorRegistration = async (
	context: Context,
	options: ValidatorRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee, validatorPublicKey } = options;

	sender = sender ?? wallets[0];

	validatorPublicKey = validatorPublicKey ?? (await getRandomConsensusKeyPair(context)).publicKey;
	fee = fee ?? "2500000000";

	const builder = app
		.resolve(ValidatorRegistrationBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.publicKeyAsset(validatorPublicKey);

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeInvalidValidatorRegistrationIfAlreadyValidator = async (
	context: Context,
	options: ValidatorRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const nonValidator = await getRandomFundedWallet(context);

	const registrationTx1 = makeValidatorRegistration(context, { nonceOffset: 0, sender: nonValidator });
	const registrationTx2 = makeValidatorRegistration(context, { nonceOffset: 1, sender: nonValidator });

	return Promise.all([registrationTx1, registrationTx2]);
};

export const makeInvalidValidatorRegistrationWithExistingPublicKeyAsset = async (
	context: Context,
	options: ValidatorRegistrationOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const nonValidator1 = await getRandomFundedWallet(context);
	const nonValidator2 = await getRandomFundedWallet(context);

	const validatorPublicKey = options.validatorPublicKey ?? (await getRandomConsensusKeyPair(context)).publicKey;

	const registrationTx1 = makeValidatorRegistration(context, {
		sender: nonValidator1,
		validatorPublicKey,
	});

	// Can't reuse key with randomWallet2
	const registrationTx2 = makeValidatorRegistration(context, {
		sender: nonValidator2,
		validatorPublicKey,
	});

	return Promise.all([registrationTx1, registrationTx2]);
};
