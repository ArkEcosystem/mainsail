import { Contracts, Identifiers } from "@mainsail/contracts";

export class P2PRegistry {
	#nodes = new Map<number, Contracts.Kernel.Application>();

	public registerNode(id: number, node: Contracts.Kernel.Application): void {
		if (this.#nodes.has(id)) {
			throw new Error(`Node with id ${id} already exists.`);
		}

		this.#nodes.set(id, node);
	}

	public getOtherNodes(id: number): Contracts.Kernel.Application[] {
		return [...this.#nodes.entries()].filter(([nodeId]) => nodeId !== id).map(([, node]) => node);
	}

	public makeBroadcaster(id: number): Broadcaster {
		return new Broadcaster(id, this);
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
			await this.#postProposal(node, proposal);
		}
	}

	async broadcastPrecommit(precommit: Contracts.Crypto.Precommit): Promise<void> {
		for (const node of this.#getNodes()) {
			await this.#postPrecommit(node, precommit);
		}
	}

	async broadcastPrevote(prevote: Contracts.Crypto.Prevote): Promise<void> {
		for (const node of this.#getNodes()) {
			await this.#postPrevote(node, prevote);
		}
	}

	#getNodes(): Contracts.Kernel.Application[] {
		return this.#p2p.getOtherNodes(this.#id);
	}

	async #postProposal(node: Contracts.Kernel.Application, proposal: Contracts.Crypto.Proposal): Promise<void> {
		await node
			.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
			.process(proposal);
	}

	async #postPrecommit(node: Contracts.Kernel.Application, precommit: Contracts.Crypto.Precommit): Promise<void> {
		await node
			.get<Contracts.Consensus.PrecommitProcessor>(Identifiers.Consensus.Processor.PreCommit)
			.process(precommit);
	}

	async #postPrevote(node: Contracts.Kernel.Application, prevote: Contracts.Crypto.Prevote): Promise<void> {
		await node.get<Contracts.Consensus.PrevoteProcessor>(Identifiers.Consensus.Processor.Prevote).process(prevote);
	}
}
