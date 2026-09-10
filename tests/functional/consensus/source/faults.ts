import type { Stub } from "@mainsail/test-runner/distribution/stub.js";

import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers } from "@mainsail/constants";

import type { Validator } from "./contracts.js";
import type { P2PRegistry } from "./p2p.js";

import { makePrecommit } from "./utilities.js";

// Fault injection for the consensus tests: message loss between nodes, and validators that stray from the
// protocol. Every helper takes the `stub` of the running test, so that the sandbox restores it afterwards.
//
// A node processes every proposal and message through its proposal and message processors, its own votes
// included, and every peer re-broadcasts a proposal it accepts, so several copies of one proposal reach a node.
// The helpers below stub those processors and account for both.

type StubFactory = (owner: object, method: string) => Stub;

const { Skipped } = Enums.Consensus.ProcessorResult;

const proposalProcessorOf = (node: Contracts.Kernel.Application) =>
	node.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal);

const messageProcessorOf = (node: Contracts.Kernel.Application) =>
	node.get<Contracts.Consensus.MessageProcessor>(Identifiers.Consensus.Processor.Message);

// Cuts `node` off from the network: every proposal and message reaching its processors is dropped, its own
// votes included, so it neither hears nor says anything. Returns the function that reconnects it.
export const disconnect = (stub: StubFactory, node: Contracts.Kernel.Application): (() => void) => {
	const stubs = [
		stub(proposalProcessorOf(node), "process").resolvedValue(Skipped),
		stub(messageProcessorOf(node), "process").resolvedValue(Skipped),
	];

	return () => {
		for (const stubbed of stubs) {
			stubbed.restore();
		}
	};
};

// Message loss on `node`: the proposals of the given rounds, and the prevotes of the given validators in the given
// rounds, never reach its processors. Everything else passes, and what the node sends is not affected. Validators
// are named by their index in the validator set, the one their votes carry.
export const loseMessagesOn = (stub: StubFactory, node: Contracts.Kernel.Application) => {
	const droppedProposals = new Set<number>();
	const droppedPrevotes = new Set<string>();

	const proposalProcessor = proposalProcessorOf(node);
	const processProposal = proposalProcessor.process.bind(proposalProcessor);

	stub(proposalProcessor, "process").callsFake(async (...arguments_: unknown[]) => {
		const proposal = arguments_[0] as Contracts.Crypto.Proposal;

		if (proposal.blockHeader.number === 1 && droppedProposals.has(proposal.round)) {
			return Skipped;
		}

		return processProposal(proposal, arguments_[1] as boolean | undefined);
	});

	const messageProcessor = messageProcessorOf(node);
	const processMessage = messageProcessor.process.bind(messageProcessor);

	stub(messageProcessor, "process").callsFake(async (...arguments_: unknown[]) => {
		const message = arguments_[0] as Contracts.Crypto.Message;

		if (
			message.type === Enums.Crypto.MessageType.Prevote &&
			message.blockNumber === 1 &&
			droppedPrevotes.has(`${message.round}:${message.validatorIndex}`)
		) {
			return Skipped;
		}

		return processMessage(message, arguments_[1] as boolean | undefined);
	});

	return {
		dropPrevote: (round: number, validatorIndex: number) => droppedPrevotes.add(`${round}:${validatorIndex}`),
		dropProposal: (round: number) => droppedProposals.add(round),
	};
};

// Drops the other validators' prevotes of `round` on `node`, so it never sees +2/3 prevotes there and neither
// locks nor updates its valid value in that round.
export const ignoreForeignPrevotes = (
	stub: StubFactory,
	node: Contracts.Kernel.Application,
	validatorIndex: number,
	round: number,
) => {
	const messageProcessor = messageProcessorOf(node);
	const process = messageProcessor.process.bind(messageProcessor);

	stub(messageProcessor, "process").callsFake(async (...arguments_: unknown[]) => {
		const message = arguments_[0] as Contracts.Crypto.Message;

		if (
			message.type === Enums.Crypto.MessageType.Prevote &&
			message.round === round &&
			message.validatorIndex !== validatorIndex
		) {
			return Skipped;
		}

		return process(message, arguments_[1] as boolean | undefined);
	});
};

// Holds the proposal for block 1, round 0 back on `node` until `release` resolves, then processes it as usual.
// Every copy of it waits for the same release, and the real processor then skips the duplicates. The outcome of
// every held copy is collected in `results`.
export const holdProposal = (
	stub: StubFactory,
	node: Contracts.Kernel.Application,
	release: () => Promise<void>,
): { results: Contracts.Consensus.ProcessorResult[] } => {
	const proposalProcessor = proposalProcessorOf(node);
	const process = proposalProcessor.process.bind(proposalProcessor);
	const stubProcess = stub(proposalProcessor, "process");

	const results: Contracts.Consensus.ProcessorResult[] = [];
	let released: Promise<void> | undefined;

	stubProcess.callsFake(async (...arguments_: unknown[]) => {
		const proposal = arguments_[0] as Contracts.Crypto.Proposal;

		if (proposal.blockHeader.number !== 1 || proposal.round !== 0) {
			return process(proposal, arguments_[1] as boolean | undefined);
		}

		released ??= release().then(() => stubProcess.restore());
		await released;

		const result = await process(proposal, arguments_[1] as boolean | undefined);
		results.push(result);

		return result;
	});

	return { results };
};

// The proposer on `node` fails to build a block before `round` (an overloaded node, say), so the earlier rounds
// time out on nil. From `round` on it proposes as usual; `beforeProposing` runs at the start of that round, before
// any message of the round exists.
export const skipProposalsBeforeRound = (
	stub: StubFactory,
	node: Contracts.Kernel.Application,
	round: number,
	beforeProposing: () => void,
) => {
	const consensus = node.get<Consensus>(Identifiers.Consensus.Service);
	const prepareProposal = consensus.prepareProposal.bind(consensus);
	const stubPrepare = stub(consensus, "prepareProposal");

	stubPrepare.callsFake(async (...arguments_: unknown[]) => {
		if (consensus.getRound() < round) {
			return;
		}

		stubPrepare.restore();
		beforeProposing();

		await prepareProposal(arguments_[0] as Contracts.Consensus.RoundState);
	});
};

// Replaces the validator's precommits in `rounds` with null precommits, then restores the real precommit. Those
// rounds still gather +2/3 precommits for something, so consensus moves on, but not +2/3 for the block, so nothing
// commits and the locks survive into the next round.
export const precommitNullInRounds = (
	stub: StubFactory,
	node: Contracts.Kernel.Application,
	validator: Validator,
	rounds: number[],
	p2p: P2PRegistry,
) => {
	const consensus = node.get<Consensus>(Identifiers.Consensus.Service);
	const stubPrecommit = stub(consensus, "precommit");

	stubPrecommit.callsFake(async (...arguments_: unknown[]) => {
		const round = consensus.getRound();

		if (!rounds.includes(round)) {
			stubPrecommit.restore();
			await consensus.precommit(arguments_[0] as string | undefined);
			return;
		}

		await p2p.broadcastMessage(await makePrecommit(node, validator, 1, round));
	});
};

// Swallows the validator's prevote of `round` and restores the real prevote afterwards. With one prevote short of
// +2/3, the round cannot end until somebody else supplies it.
export const skipPrevoteInRound = (stub: StubFactory, node: Contracts.Kernel.Application, round: number) => {
	const consensus = node.get<Consensus>(Identifiers.Consensus.Service);
	const prevote = consensus.prevote.bind(consensus);
	const stubPrevote = stub(consensus, "prevote");

	stubPrevote.callsFake(async (...arguments_: unknown[]) => {
		if (consensus.getRound() !== round) {
			await prevote(arguments_[0] as string | undefined);
			return;
		}

		stubPrevote.restore();
	});
};
