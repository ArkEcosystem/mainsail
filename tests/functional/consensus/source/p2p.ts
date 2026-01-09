import { Enums, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

const isApp = (node: Contracts.Kernel.Application | undefined): node is Contracts.Kernel.Application =>
	node !== undefined;

const isProposal = (message: Message): message is Contracts.Crypto.Proposal =>
	(message as Contracts.Crypto.Proposal).blockHeader !== undefined;

export type Message = Contracts.Crypto.Proposal | Contracts.Crypto.Message;

export class Messages<T extends Message> {
	#messages = new Map<string, Map<string, T>>();

	public getMessagesMap(height: number, round: number): Map<string, T> {
		const key = `${round}:${height}`;

		if (!this.#messages.has(key)) {
			this.#messages.set(key, new Map());
		}

		return this.#messages.get(key)!;
	}

	set(message: T): void {
		if (isProposal(message)) {
			this.getMessagesMap(message.blockHeader.number, message.round).set(
				message.serialized.toString("hex"),
				message,
			);
		} else {
			this.getMessagesMap(message.blockNumber, message.round).set(message.serialized.toString("hex"), message);
		}
	}

	getMessages(height: number, round: number): T[] {
		return [...this.getMessagesMap(height, round).values()].sort((a, b) => a.validatorIndex - b.validatorIndex);
	}

	getMessagesByValidator(height: number, round: number, validatorIndex: number): T[] {
		return this.getMessages(height, round).filter((message) => message.validatorIndex === validatorIndex);
	}
}

export class P2PRegistry {
	#nodes = new Map<number, Contracts.Kernel.Application>();

	public proposals = new Messages<Contracts.Crypto.Proposal>();
	public prevotes = new Messages<Contracts.Crypto.Message>();
	public precommits = new Messages<Contracts.Crypto.Message>();

	public registerNode(id: number, node: Contracts.Kernel.Application): void {
		if (this.#nodes.has(id)) {
			throw new Error(`Node with id ${id} already exists.`);
		}

		this.#nodes.set(id, node);
	}

	public getOtherNodes(id: number): Contracts.Kernel.Application[] {
		return [...this.#nodes.entries()].filter(([nodeId]) => nodeId !== id).map(([, node]) => node);
	}

	public getAllNodes(): Contracts.Kernel.Application[] {
		return [...this.#nodes.entries()].map(([, node]) => node);
	}

	getNodes(nodes?: number[]): Contracts.Kernel.Application[] {
		if (nodes === undefined) {
			return this.getAllNodes();
		}

		return nodes.map((node) => this.#nodes.get(node)).filter(isApp);
	}

	public makeBroadcaster(id: number): Broadcaster {
		return new Broadcaster(id, this);
	}

	async postProposal(node: Contracts.Kernel.Application, proposal: Contracts.Crypto.Proposal): Promise<void> {
		this.proposals.set(proposal);

		const handle = async () => {
			// simulate post-proposal controller
			const deserializedProposal = await node
				.get<Contracts.Crypto.ProposalFactory>(Identifiers.Cryptography.Proposal.Factory)
				.makeProposalFromBytes(proposal.serialized);

			const result = await node
				.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
				.process(deserializedProposal);

			if (result === Enums.Consensus.ProcessorResult.Invalid) {
				console.log("postProposal process failed");
			}
		};

		setTimeout(() => {
			void handle();
		}, 0);
	}

	async postMessage(node: Contracts.Kernel.Application, message: Contracts.Crypto.Message): Promise<void> {
		if (message.type === Enums.Crypto.MessageType.Prevote) {
			this.prevotes.set(message);
		} else {
			this.precommits.set(message);
		}

		setTimeout(() => {
			void node
				.get<Contracts.Consensus.MessageProcessor>(Identifiers.Consensus.Processor.Message)
				.process(message);
		}, 0);
	}

	async postCommit(node: Contracts.Kernel.Application, commit: Contracts.Crypto.Commit): Promise<void> {
		setTimeout(() => {
			void node.get<Contracts.Consensus.CommitProcessor>(Identifiers.Consensus.Processor.Commit).process(commit);
		}, 0);
	}

	async broadcastProposal(proposal: Contracts.Crypto.Proposal, nodes?: number[]): Promise<void> {
		for (const node of this.getNodes(nodes)) {
			await this.postProposal(node, proposal);
		}
	}

	async broadcastMessage(message: Contracts.Crypto.Message, nodes?: number[]): Promise<void> {
		for (const node of this.getNodes(nodes)) {
			await this.postMessage(node, message);
		}
	}
}

export class Broadcaster implements Contracts.P2P.Broadcaster {
	#p2p: P2PRegistry;
	#id: number;

	public constructor(id: number, p2p: P2PRegistry) {
		this.#id = id;
		this.#p2p = p2p;
	}

	broadcastTransactions(transactions: Contracts.Crypto.Transaction[]): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async broadcastProposal(proposal: Contracts.Crypto.Proposal): Promise<void> {
		for (const node of this.#getNodes()) {
			await this.#p2p.postProposal(node, proposal);
		}
	}

	async broadcastMessage(message: Contracts.Crypto.Message): Promise<void> {
		for (const node of this.#getNodes()) {
			await this.#p2p.postMessage(node, message);
		}
	}

	#getNodes(): Contracts.Kernel.Application[] {
		return this.#p2p.getOtherNodes(this.#id);
	}
}
