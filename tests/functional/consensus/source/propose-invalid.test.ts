import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import {
	Transfers,
	Votes,
	MultiSignatureRegistrations,
	UsernameRegistrations,
	UsernameResignations,
	ValidatorRegistrations,
	ValidatorResignations,
} from "@mainsail/test-transaction-builders";
import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBockHeight, assertBockRound, assertInvalidBlock } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { makeCustomProposal, makeTransactionBuilderContext } from "./custom-proposal.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getValidators, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Propose Invalid Blocks", ({ beforeEach, afterEach, each, stub }) => {
	const totalNodes = 5;

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidators(context.nodes[0], validators);

		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	const assertNextBlockOk = async (nodes: Sandbox[], height = 1, round = 1) => {
		await snoozeForBlock(nodes);
		await assertBockHeight(nodes, height);
		await assertBockRound(nodes, round);
	};

	each(
		"should reject block with invalid transfers",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) => Transfers.makeTransferInsufficientBalance(context),
				exception: Exceptions.InsufficientBalanceError,
			},
			{
				builder: async (context) => Transfers.makeTransferInvalidHeader(context),
				exception: Exceptions.BlockNotVerified,
			},
			// {
			// 	// TODO: assert TransactionSchemaError: data/network must pass "network" keyword validation in postProposal
			// 	// handler
			// 	builder: async (context) => Transfers.makeTransferInvalidNetwork(context),
			// 	exception: Exceptions.BlockNotVerified,
			// },
			{
				builder: async (context) => Transfers.makeTransferInvalidNonceTooLow(context),
				exception: Exceptions.InvalidNonce,
			},
			{
				builder: async (context) => Transfers.makeTransferInvalidNonceTooHigh(context),
				exception: Exceptions.InvalidNonce,
			},
			{
				builder: async (context) => Transfers.makeTransferInvalidSignature(context),
				exception: Exceptions.BlockNotVerified,
			},
			// {
			// 	// TODO: enforce static fee on protocol
			// 	builder: async (context) => Transfers.makeTransferInvalidFee(context),
			// 	exception: Exceptions.BlockNotVerified,
			// },
		],
	);

	each(
		"should reject block with invalid votes",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) => Votes.makeInvalidDoubleVote(context),
				exception: Exceptions.AlreadyVotedError,
			},
			{
				builder: async (context) => Votes.makeInvalidUnvoteForNonValidator(context),
				exception: Exceptions.NoVoteError,
			},
			{
				builder: async (context) => Votes.makeInvalidVoteForNonValidator(context),
				exception: Exceptions.VotedForNonValidatorError,
			},
			{
				builder: async (context) => Votes.makeInvalidVoteForResignedValidator(context),
				exception: Exceptions.VotedForResignedValidatorError,
			},
			{
				builder: async (context) => Votes.makeInvalidVoteSwitchForNonVotedValidator(context),
				exception: Exceptions.UnvoteMismatchError,
			},
		],
	);

	each(
		"should reject block with invalid multi signature registrations",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) =>
					MultiSignatureRegistrations.makeInvalidMultiSignatureRegistrationWithInvalidParticipantSignature(
						context,
					),
				exception: Exceptions.InvalidMultiSignatureError,
			},
			// {
			// 	// TODO: invalid schema throws too early in deserialize proposal

			// 	builder: async (context) =>
			// 		MultiSignatureRegistrations.makeInvalidMultiSignatureRegistrationWithMissingParticipantSignature(
			// 			context,
			// 		),
			// 	exception: Exceptions.InvalidMultiSignatureError,
			// },
		],
	);

	each(
		"should reject block with invalid username registration",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) => [
					await UsernameRegistrations.makeUsernameRegistration(context, {
						username: "taken",
						nonceOffset: 0,
					}),
					await UsernameRegistrations.makeUsernameRegistration(context, {
						username: "taken",
						nonceOffset: 1,
					}),
				],
				exception: Exceptions.WalletUsernameAlreadyRegisteredError,
			},
		],
	);

	each(
		"should reject block with invalid username resignation",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) => UsernameResignations.makeInvalidUsernameResignationWithoutUsername(context),
				exception: Exceptions.WalletUsernameNotRegisteredError,
			},
			{
				builder: async (context) => UsernameResignations.makeInvalidDuplicateUsernameRegistration(context),
				exception: Exceptions.WalletUsernameAlreadyRegisteredError,
			},
			{
				builder: async (context) => [
					await UsernameRegistrations.makeUsernameRegistration(context, {
						nonceOffset: 0,
					}),
					await UsernameResignations.makeUsernameResignation(context, {
						nonceOffset: 1,
					}),
					await UsernameResignations.makeUsernameResignation(context, {
						nonceOffset: 2,
					}),
				],
				exception: Exceptions.WalletUsernameNotRegisteredError,
			},
		],
	);

	each(
		"should reject block with invalid validator registration",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) =>
					ValidatorRegistrations.makeInvalidValidatorRegistrationWithExistingPublicKeyAsset(context),
				exception: Exceptions.ValidatorPublicKeyAlreadyRegisteredError,
			},
			{
				builder: async (context) =>
					ValidatorRegistrations.makeInvalidValidatorRegistrationIfAlreadyValidator(context),
				exception: Exceptions.WalletIsAlreadyValidatorError,
			},
		],
	);

	each(
		"should reject block with invalid validator resignation",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			{
				builder: async (context) =>
					ValidatorResignations.makeInvalidValidatorRegistrationAfterResignation(context),
				exception: Exceptions.WalletIsAlreadyValidatorError,
			},
			{
				builder: async (context) =>
					ValidatorResignations.makeInvalidValidatorResignationForNonValidator(context),
				exception: Exceptions.WalletNotAValidatorError,
			},
			{
				builder: async (context) => [
					await ValidatorRegistrations.makeValidatorRegistration(context, {
						nonceOffset: 0,
					}),
					await ValidatorResignations.makeValidatorResignation(context, {
						nonceOffset: 1,
					}),
					await ValidatorResignations.makeValidatorResignation(context, {
						nonceOffset: 2,
					}),
				],
				exception: Exceptions.WalletIsAlreadyValidatorError,
			},
		],
	);

	each(
		"should reject block with invalid multi payments",
		async ({
			context: { nodes, validators },
			dataset,
		}: {
			context: { nodes: Sandbox[]; validators: Validator[] };
			dataset;
		}) => {
			const node0 = nodes[0];

			const stubPropose = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "propose");
			stubPropose.callsFake(async () => {
				const context = makeTransactionBuilderContext(node0, nodes, validators);
				const transactions = await dataset.builder(context);

				const proposal = await makeCustomProposal(
					{ node: node0, validators },
					Array.isArray(transactions) ? transactions : [transactions],
				);

				node0.app
					.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
					.process(proposal);

				stubPropose.restore();
			});

			await assertInvalidBlock(dataset.exception, nodes.slice(1), 1);
			await assertNextBlockOk(nodes);
		},
		[
			// TODO: invalid schema throws too early in deserialize proposal
			// {
			// 	builder: async (context) => MultiPayments.makeInvalidMultiPaymentWithMissingPayments(context),
			// 	exception: Exceptions.InvalidTransactionBytesError,
			// },
			// {
			// 	builder: async (context) => MultiPayments.makeInvalidMultiPaymentWithBadAmounts(context),
			// 	exception: Exceptions.InvalidTransactionBytesError,
			// },
			// {
			// 	builder: async (context) => MultiPayments.makeInvalidMultiPaymentExceedingMaxPayments(context),
			// 	exception: Exceptions.InvalidTransactionBytesError,
			// },
		],
	);
});
