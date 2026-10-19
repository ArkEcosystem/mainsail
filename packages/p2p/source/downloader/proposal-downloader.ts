import type { Contracts } from "@mainsail/contracts";

import { Enums, Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { getRandomPeer } from "../utils/index.js";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	blockNumber: number;
	round: number;
};
@injectable()
export class ProposalDownloader implements Contracts.P2P.Downloader {
	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.P2P.Downloader.Block)
	private readonly blockDownloader!: Contracts.P2P.Downloader;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly factory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	#downloadsByBlockNumber: Map<number, Set<number>> = new Map();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Events.BlockEvent.Applied, {
			handle: async ({ data }): Promise<void> => {
				this.#downloadsByBlockNumber.delete((data as Contracts.Crypto.BlockData).number);
			},
		});
	}

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => this.#canDownload(header, peer.header));

		if (peers.length > 0) {
			this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const ourHeader = this.headerFactory();
		if (!this.#canDownload(ourHeader, peer.header)) {
			return;
		}

		const job: DownloadJob = {
			blockNumber: peer.header.blockNumber,
			peer,
			round: peer.header.round,
		};

		this.#setDownload(job);
		void this.#downloadProposalFromPeer(job);
	}

	public isDownloading(): boolean {
		return this.#downloadsByBlockNumber.size > 0;
	}

	#canDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData) {
		if (ourHeader.blockNumber !== peerHeader.blockNumber || ourHeader.round !== peerHeader.round) {
			return false;
		}

		if (
			this.#downloadsByBlockNumber.has(peerHeader.blockNumber) &&
			this.#downloadsByBlockNumber.get(peerHeader.blockNumber)!.has(peerHeader.round)
		) {
			return false;
		}

		return ourHeader.proposal === undefined && !!peerHeader.proposedBlockHash;
	}

	#setDownload(job: DownloadJob) {
		if (!this.#downloadsByBlockNumber.has(job.blockNumber)) {
			this.#downloadsByBlockNumber.set(job.blockNumber, new Set());
		}

		this.#downloadsByBlockNumber.get(job.blockNumber)!.add(job.round);
	}

	#removeDownload(job: DownloadJob) {
		if (!this.#downloadsByBlockNumber.has(job.blockNumber)) {
			return;
		}

		this.#downloadsByBlockNumber.get(job.blockNumber)!.delete(job.round);

		if (this.#downloadsByBlockNumber.get(job.blockNumber)!.size === 0) {
			this.#downloadsByBlockNumber.delete(job.blockNumber);
		}
	}

	async #downloadProposalFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getProposal(job.peer, {
				blockNumber: job.blockNumber,
				round: job.round,
			});

			if (result.proposal.length === 0) {
				return;
			}

			const proposal = await this.factory.makeProposalFromBytes(result.proposal);
			if (proposal.blockHeader.number !== job.blockNumber) {
				throw new Error(
					`Received proposal blockNumber ${proposal.blockHeader.number} does not match expected blockNumber ${job.blockNumber}`,
				);
			}

			if (proposal.round !== job.round) {
				throw new Error(`Received proposal round ${proposal.round} does not match expected round ${job.round}`);
			}

			const response = await this.proposalProcessor.process(proposal, false);
			if (response === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error(`Received proposal is invalid`);
			}

			this.state.resetLastMessageTime();
		} catch (rawError) {
			error = ensureError(rawError);
		} finally {
			// Always free the slot, even on an empty reply (the peer has moved past the
			// requested round); otherwise the round could never be requested again.
			this.#removeDownload(job);
		}

		if (error) {
			this.peerDisposer.banPeer(job.peer.ip, error);
			this.tryToDownload();
		}
	}
}
