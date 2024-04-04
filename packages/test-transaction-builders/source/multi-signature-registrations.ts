import { Contracts } from "@mainsail/contracts";
import { MultiSignatureBuilder } from "@mainsail/crypto-transaction-multi-signature-registration";
import { BigNumber } from "@mainsail/utils";

import { Context, MultiPaymentOptions, MultiSignatureOptions } from "./types.js";
import { buildSignedTransaction, getRandomColdWallet, getRandomFundedWallet, getRandomSignature } from "./utils.js";

export const makeMultiSignatureRegistration = async (
	context: Context,
	options: MultiSignatureOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { sandbox, wallets } = context;
	const { app } = sandbox;

	let { sender, fee, participants, min, participantSignatureOverwrite } = options;

	sender = sender ?? wallets[0];
	fee = fee ?? "500000000";

	let builder = app
		.resolve(MultiSignatureBuilder)
		.senderPublicKey(sender.publicKey)
		.fee(BigNumber.make(fee).toFixed())
		.min(min ?? participants.length);

	for (const participant of participants) {
		builder = builder.participant(participant.publicKey);
	}

	const participantSignatures: string[] = [];
	for (const [index, participant] of participants.entries()) {
		builder = await builder.multiSignWithKeyPair(participant, index);

		const participantSignature = builder.data.signatures![index];
		participantSignatures.push(participantSignature);

		if (participantSignatureOverwrite && participantSignatureOverwrite[index]) {
			builder.data.signatures![index] = participantSignatureOverwrite[index];
		}
	}

	return buildSignedTransaction(sandbox, builder, sender, { ...options, participantSignatures });
};

export const makeValidMultiSignatureRegistration = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);

	const participants = [participant1.keyPair, participant2.keyPair];

	return makeMultiSignatureRegistration(context, {
		participants,
		sender: randomWallet,
	});
};

export const makeValidMultiSignatureRegistrationWithMinAndMaxParticipants = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const minParticipants = 2;
	const maxParticipants = 16;

	const allParticipants: Contracts.Crypto.KeyPair[] = [];
	for (let index = 0; index < maxParticipants; index++) {
		allParticipants.push((await getRandomColdWallet(context)).keyPair);
	}

	const minimumParticipants = allParticipants.slice(0, minParticipants);
	const registrationTxMin = makeMultiSignatureRegistration(context, {
		participants: minimumParticipants,
		sender: randomWallet,
	});
	const registrationTxMax = makeMultiSignatureRegistration(context, {
		participants: allParticipants,
		sender: randomWallet2,
	});

	return Promise.all([registrationTxMin, registrationTxMax]);
};

export const makeDuplicateMultiSignatureRegistration = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);

	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);

	const participants = [participant1.keyPair, participant2.keyPair];

	const registrationTx1 = makeMultiSignatureRegistration(context, {
		nonceOffset: 0,
		participants,
		sender: randomWallet,
	});

	const registrationTx2 = makeMultiSignatureRegistration(context, {
		nonceOffset: 0,
		participants,
		sender: randomWallet,
	});

	return Promise.all([registrationTx1, registrationTx2]);
};

export const makeInvalidMultiSignatureRegistrationWithInvalidParticipantSignature = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);

	const participants = [participant1.keyPair, participant2.keyPair];

	return makeMultiSignatureRegistration(context, {
		participantSignatureOverwrite: {
			0: `00${await getRandomSignature(context)}`,
		},
		participants,
		sender: randomWallet,
	});
};

export const makeInvalidMultiSignatureRegistrationWithMissingParticipantSignature = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction> => {
	const randomWallet = await getRandomFundedWallet(context);

	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);
	const participant3 = await getRandomColdWallet(context);

	const participants = [participant1.keyPair, participant2.keyPair, participant3.keyPair];

	return makeMultiSignatureRegistration(context, {
		omitParticipantSignatures: [1], // omit participant with index 1
		participants,
		sender: randomWallet,
	});
};

export const makeMultiSignatureRegistrationSameAssetDifferentSender = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);

	const participant1 = await getRandomColdWallet(context);
	const participant2 = await getRandomColdWallet(context);

	const participants = [participant1.keyPair, participant2.keyPair];

	const registrationTx1 = makeMultiSignatureRegistration(context, {
		participants,
		sender: randomWallet,
	});

	const registrationTx2 = makeMultiSignatureRegistration(context, {
		participants,
		sender: randomWallet2,
	});

	return Promise.all([registrationTx1, registrationTx2]);
};

export const makeInvalidMultiSignatureRegistratioOutsideMinMaxParticipants = async (
	context: Context,
	options: MultiPaymentOptions = {},
): Promise<Contracts.Crypto.Transaction[]> => {
	const randomWallet = await getRandomFundedWallet(context);
	const randomWallet2 = await getRandomFundedWallet(context);
	const randomWallet3 = await getRandomFundedWallet(context);

	const minParticipants = 1; // set to 0 in callback below
	const maxParticipants = 16 + 1;

	const allParticipants: Contracts.Crypto.KeyPair[] = [];
	for (let index = 0; index < maxParticipants; index++) {
		allParticipants.push((await getRandomColdWallet(context)).keyPair);
	}

	const minimumParticipants = allParticipants.slice(0, minParticipants);
	const registrationTx1 = makeMultiSignatureRegistration(context, {
		callback: async (transaction) => {
			// set min participants to 0
			transaction.serialized.fill(0, 58, 59);
		},
		participants: minimumParticipants,
		sender: randomWallet,
	});

	const registrationTx2 = makeMultiSignatureRegistration(context, {
		participants: [allParticipants[0]],
		sender: randomWallet2,
	});

	const registrationTx3 = makeMultiSignatureRegistration(context, {
		participants: allParticipants,
		sender: randomWallet3,
	});

	return Promise.all([registrationTx1, registrationTx2, registrationTx3]);
};
