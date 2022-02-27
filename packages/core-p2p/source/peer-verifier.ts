import Interfaces, { BINDINGS, IBlockFactory, IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Services, Utils } from "@arkecosystem/core-kernel";
import { DatabaseInterceptor } from "@arkecosystem/core-state";
import assert from "assert";
import pluralize from "pluralize";
import { inspect } from "util";

import { Severity } from "./enums";

export class PeerVerificationResult {
	public constructor(
		public readonly myHeight: number,
		public readonly hisHeight: number,
		public readonly highestCommonHeight: number,
	) {}

	public get forked(): boolean {
		return this.highestCommonHeight !== this.myHeight && this.highestCommonHeight !== this.hisHeight;
	}
}

// todo: review the implementation
@Container.injectable()
export class PeerVerifier implements Contracts.P2P.PeerVerifier {
	@Container.inject(Container.Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@Container.inject(Container.Identifiers.DposState)
	@Container.tagged("state", "blockchain")
	private readonly dposState!: Contracts.State.DposState;

	@Container.inject(Container.Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.DatabaseInterceptor)
	private readonly databaseInterceptor!: DatabaseInterceptor;

	@Container.inject(Container.Identifiers.PeerCommunicator)
	private communicator!: Contracts.P2P.PeerCommunicator;

	@Container.inject(BINDINGS.Configuration)
	private readonly configuration!: IConfiguration;

	@Container.inject(BINDINGS.Block.Factory)
	private readonly blockFactory!: IBlockFactory;

	private logPrefix!: string;

	private peer!: Contracts.P2P.Peer;

	public initialize(peer: Contracts.P2P.Peer): PeerVerifier {
		this.peer = peer;

		this.logPrefix = `Peer verify ${peer.ip}:`;

		return this;
	}

	public async checkState(
		claimedState: Contracts.P2P.PeerState,
		deadline: number,
	): Promise<PeerVerificationResult | undefined> {
		if (!(await this.checkStateHeader(claimedState))) {
			return undefined;
		}

		const claimedHeight = Number(claimedState.header.height);
		const ourHeight: number = this.ourHeight();
		if (await this.weHavePeersHighestBlock(claimedState, ourHeight)) {
			// Case3 and Case5
			return new PeerVerificationResult(ourHeight, claimedHeight, claimedHeight);
		}

		const highestCommonBlockHeight = await this.findHighestCommonBlockHeight(claimedHeight, ourHeight, deadline);
		if (highestCommonBlockHeight === undefined) {
			return undefined;
		}

		if (!(await this.verifyPeerBlocks(highestCommonBlockHeight + 1, claimedHeight, deadline))) {
			return undefined;
		}

		this.log(Severity.DEBUG_EXTRA, "success");

		return new PeerVerificationResult(ourHeight, claimedHeight, highestCommonBlockHeight);
	}

	private async checkStateHeader(claimedState: Contracts.P2P.PeerState): Promise<boolean> {
		const blockHeader: Interfaces.IBlockData = claimedState.header as Interfaces.IBlockData;
		const claimedHeight = Number(blockHeader.height);
		if (claimedHeight !== claimedState.height) {
			this.log(
				Severity.DEBUG_EXTRA,
				`Peer claimed contradicting heights: state height=${claimedState.height} vs ` +
					`state header height: ${claimedHeight}`,
			);
			return false;
		}

		try {
			const ownBlock: Interfaces.IBlock | undefined = this.app
				.get<Contracts.State.StateStore>(Container.Identifiers.StateStore)
				.getLastBlocks()
				.find((block) => block.data.height === blockHeader.height);

			// Use shortcut to prevent expensive crypto if the block header equals our own.
			if (ownBlock && JSON.stringify(ownBlock.getHeader()) === JSON.stringify(blockHeader)) {
				return true;
			}

			if (claimedHeight < this.ourHeight()) {
				const roundInfo = Utils.roundCalculator.calculateRound(claimedHeight, this.configuration);
				const delegates = await this.getDelegatesByRound(roundInfo);
				if (this.verifyPeerBlock(blockHeader, claimedHeight, delegates)) {
					return true;
				}
			} else {
				const claimedBlock: Interfaces.IBlock | undefined = await this.blockFactory.fromData(blockHeader);
				if (claimedBlock?.verifySignature()) {
					return true;
				}
			}

			this.log(
				Severity.DEBUG_EXTRA,
				`Claimed block header ${blockHeader.height}:${blockHeader.id} failed signature verification`,
			);
			return false;
		} catch (error) {
			this.log(
				Severity.DEBUG_EXTRA,
				`Claimed block header ${blockHeader.height}:${blockHeader.id} failed verification: ` + error.message,
			);
			return false;
		}
	}

	private ourHeight(): number {
		let height: number | undefined;

		try {
			height = this.app.get<Contracts.State.StateStore>(Container.Identifiers.StateStore).getLastHeight();

			assert(Number.isInteger(height));
		} catch {
			throw new Error(`Couldn't derive our chain height: ${height}`);
		}

		return height;
	}

	private async weHavePeersHighestBlock(claimedState: any, ourHeight: number): Promise<boolean> {
		const claimedHeight = Number(claimedState.header.height);

		if (claimedHeight > ourHeight) {
			const blocksAhead = claimedHeight - ourHeight;
			this.log(
				Severity.DEBUG_EXTRA,
				`peer's claimed chain is ${pluralize("block", blocksAhead, true)} higher than ` +
					`ours (our height ${ourHeight}, his claimed height ${claimedHeight})`,
			);

			return false;
		}

		const blocks = await this.databaseInterceptor.getBlocksByHeight([claimedHeight]);

		assert.strictEqual(
			blocks.length,
			1,
			`databaseInterceptor.getBlocksByHeight([ ${claimedHeight} ]) returned ${blocks.length} results: ` +
				this.anyToString(blocks) +
				` (our chain is at height ${ourHeight})`,
		);

		const ourBlockAtHisHeight = blocks[0];

		if (ourBlockAtHisHeight.id === claimedState.header.id) {
			if (claimedHeight === ourHeight) {
				this.log(
					Severity.DEBUG_EXTRA,
					`success: peer's latest block is the same as our latest ` +
						`block (height=${claimedHeight}, id=${claimedState.header.id}). Identical chains.`,
				);
			} else {
				this.log(
					Severity.DEBUG_EXTRA,
					`success: peer's latest block ` +
						`(height=${claimedHeight}, id=${claimedState.header.id}) is part of our chain. ` +
						`Peer is ${pluralize("block", ourHeight - claimedHeight, true)} behind us.`,
				);
			}
			return true;
		}

		this.log(
			Severity.DEBUG,
			`peer's latest block (height=${claimedHeight}, id=${claimedState.header.id}), is different than the ` +
				`block at the same height in our chain (id=${ourBlockAtHisHeight.id}). Peer has ` +
				(claimedHeight < ourHeight ? `a shorter and` : `an equal-height but`) +
				` different chain.`,
		);

		return false;
	}

	private async findHighestCommonBlockHeight(
		claimedHeight: number,
		ourHeight: number,
		deadline: number,
	): Promise<number | undefined> {
		// The highest common block is in the interval [1, min(claimed height, our height)].
		// Search in that interval using an 8-ary search. Compared to binary search this
		// will do more comparisons. However, comparisons are practically for free while
		// the most expensive part in our case is retrieving blocks from our database, from
		// peer's database and over the network. Number of database and network calls is
		// log_8(interval length) for 8-ary search, which is less than log_2(interval length)
		// for binary search.

		const nAry = 8;

		const probe = async (heightsToProbe: number[]): Promise<number | undefined> => {
			const ourBlocks = await this.databaseInterceptor.getBlocksByHeight(heightsToProbe);

			assert.strictEqual(ourBlocks.length, heightsToProbe.length);

			const probesIdByHeight = {};
			const probesHeightById = {};

			for (const b of ourBlocks) {
				Utils.assert.defined<string>(b.id);

				probesIdByHeight[b.height] = b.id;
				probesHeightById[b.id] = b.height;
			}

			// Make sure getBlocksByHeight() returned a block for every height we asked.
			for (const height of heightsToProbe) {
				assert.strictEqual(typeof probesIdByHeight[height], "string");
			}

			const ourBlocksPrint = ourBlocks.map((b) => `{ height=${b.height}, id=${b.id} }`).join(", ");
			// eslint-disable-next-line unicorn/prefer-at
			const rangePrint = `[${ourBlocks[0].height.toLocaleString()}, ${ourBlocks[
				ourBlocks.length - 1
			].height.toLocaleString()}]`;

			const msRemaining = this.throwIfPastDeadline(deadline);

			this.log(Severity.DEBUG_EXTRA, `probe for common blocks in range ${rangePrint}`);

			const highestCommon = await this.communicator.hasCommonBlocks(
				this.peer,
				Object.keys(probesHeightById),
				msRemaining,
			);

			if (!highestCommon) {
				return undefined;
			}

			if (!probesHeightById[highestCommon.id]) {
				this.log(
					Severity.DEBUG_EXTRA,
					`failure: bogus reply from peer for common blocks ${ourBlocksPrint}: ` +
						`peer replied with block id ${highestCommon.id} which we did not ask for`,
				);
				return undefined;
			}

			if (probesHeightById[highestCommon.id] !== highestCommon.height) {
				this.log(
					Severity.DEBUG_EXTRA,
					`failure: bogus reply from peer for common blocks ${ourBlocksPrint}: ` +
						`peer pretends to have block with id ${highestCommon.id} at height ` +
						`${highestCommon.height}, however a block with the same id is at ` +
						`different height ${probesHeightById[highestCommon.id]} in our chain`,
				);
				return undefined;
			}

			return highestCommon.height;
		};

		const nSect = new Utils.NSect(nAry, probe);

		const highestCommonBlockHeight = await nSect.find(1, Math.min(claimedHeight, ourHeight));

		if (highestCommonBlockHeight === undefined) {
			this.log(Severity.INFO, `failure: could not determine a common block`);
		} else {
			this.log(Severity.DEBUG_EXTRA, `highest common block height: ${highestCommonBlockHeight}`);
		}

		return highestCommonBlockHeight;
	}

	private async verifyPeerBlocks(startHeight: number, claimedHeight: number, deadline: number): Promise<boolean> {
		const roundInfo = Utils.roundCalculator.calculateRound(startHeight, this.configuration);
		const { maxDelegates, roundHeight } = roundInfo;
		const lastBlockHeightInRound = roundHeight + maxDelegates - 1;

		// Verify a few blocks that are not too far up from the last common block. Within the
		// same round as the last common block or in the next round if the last common block is
		// the last block in a round (so that the delegates calculations are still the same for
		// both chains).

		const delegates = await this.getDelegatesByRound(roundInfo);

		const hisBlocksByHeight = {};

		const endHeight = Math.min(claimedHeight, lastBlockHeightInRound);

		for (let height = startHeight; height <= endHeight; height++) {
			if (
				hisBlocksByHeight[height] === undefined &&
				!(await this.fetchBlocksFromHeight({
					blocksByHeight: hisBlocksByHeight,
					deadline,
					endHeight,
					height,
				}))
			) {
				return false;
			}
			assert(hisBlocksByHeight[height] !== undefined);

			if (!this.verifyPeerBlock(hisBlocksByHeight[height], height, delegates)) {
				return false;
			}
		}

		return true;
	}

	private async getDelegatesByRound(
		roundInfo: Contracts.Shared.RoundInfo,
	): Promise<Record<string, Contracts.State.Wallet>> {
		let delegates: any = await this.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.call("getActiveDelegates", { roundInfo });

		if (delegates.length === 0) {
			// This must be the current round, still not saved into the database (it is saved
			// only after it has completed). So fetch the list of delegates from the wallet
			// manager.
			// ! looks like DoS attack vector
			const dposRound = this.dposState.getRoundInfo();
			assert.strictEqual(dposRound.round, roundInfo.round);
			assert.strictEqual(dposRound.maxDelegates, roundInfo.maxDelegates);
			delegates = [...this.dposState.getRoundDelegates()];
		}

		const delegatesByPublicKey: Record<string, Contracts.State.Wallet> = {};
		for (const delegate of delegates) {
			Utils.assert.defined<string>(delegate.getPublicKey());
			delegatesByPublicKey[delegate.getPublicKey()!] = delegate;
		}
		return delegatesByPublicKey;
	}

	private async fetchBlocksFromHeight({
		height,
		endHeight,
		blocksByHeight,
		deadline,
	}: {
		height: number;
		endHeight: number;
		blocksByHeight: object;
		deadline: number;
	}): Promise<boolean> {
		let response;

		try {
			this.throwIfPastDeadline(deadline);

			// returns blocks from the next one, thus we do -1
			response = await this.communicator.getPeerBlocks(this.peer, {
				blockLimit: Math.max(Math.min(endHeight - height + 1, 400), 1),
				fromBlockHeight: height - 1,
				headersOnly: true,
			});
		} catch (error) {
			this.log(
				Severity.DEBUG_EXTRA,
				`failure: could not get blocks starting from height ${height} from peer: exception: ${error.message}`,
			);
			return false;
		}

		if (!response || response.length === 0) {
			this.log(
				Severity.DEBUG_EXTRA,
				`failure: could not get blocks starting from height ${height} ` +
					`from peer: unexpected response: ${this.anyToString(response)}`,
			);
			return false;
		}

		for (const [index, element] of response.entries()) {
			blocksByHeight[height + index] = element;
		}

		return true;
	}

	private async verifyPeerBlock(
		blockData: Interfaces.IBlockData,
		expectedHeight: number,
		delegatesByPublicKey: Record<string, Contracts.State.Wallet>,
	): Promise<boolean> {
		const block: Interfaces.IBlock | undefined = await this.blockFactory.fromData(blockData);

		Utils.assert.defined<Interfaces.IBlock>(block);

		if (!block.verifySignature()) {
			this.log(
				Severity.DEBUG_EXTRA,
				`failure: peer's block at height ${expectedHeight} does not pass crypto-validation`,
			);
			return false;
		}

		const height = block.data.height;

		if (height !== expectedHeight) {
			this.log(
				Severity.DEBUG_EXTRA,
				`failure: asked for block at height ${expectedHeight}, but got a block with height ${height} instead`,
			);
			return false;
		}

		if (delegatesByPublicKey[block.data.generatorPublicKey]) {
			this.log(
				Severity.DEBUG_EXTRA,
				`successfully verified block at height ${height}, signed by ` + block.data.generatorPublicKey,
			);

			return true;
		}

		this.log(
			Severity.DEBUG_EXTRA,
			`failure: block ${this.anyToString(blockData)} is not signed by any of the delegates ` +
				`for the corresponding round: ` +
				this.anyToString(Object.values(delegatesByPublicKey)),
		);

		return false;
	}

	private throwIfPastDeadline(deadline: number): number {
		const now = Date.now();

		if (deadline <= now) {
			// Throw an exception so that it can cancel everything and break out of peer.ping().
			throw new Error("timeout elapsed before successful completion of the verification");
		}

		return deadline - now;
	}

	private anyToString(value: any): string {
		return inspect(value, { breakLength: Number.POSITIVE_INFINITY, sorted: true });
	}

	private log(severity: Severity, message: string): void {
		const fullMessage = `${this.logPrefix} ${message}`;
		switch (severity) {
			case Severity.DEBUG_EXTRA:
				/* istanbul ignore else */
				if (process.env.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA) {
					this.logger.debug(fullMessage);
				}
				break;
			case Severity.DEBUG:
				this.logger.debug(fullMessage);
				break;
			case Severity.INFO:
				this.logger.info(fullMessage);
				break;
		}
	}
}
