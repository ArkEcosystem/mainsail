/* eslint-disable unicorn/prefer-at */
import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
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

// @TODO review the implementation
@injectable()
export class PeerVerifier implements Contracts.P2P.PeerVerifier {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.PeerCommunicator)
	private communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	#logPrefix!: string;

	#peer!: Contracts.P2P.Peer;

	public initialize(peer: Contracts.P2P.Peer): PeerVerifier {
		this.#peer = peer;

		this.#logPrefix = `Peer verify ${peer.ip}:`;

		return this;
	}

	public async checkState(
		claimedState: Contracts.P2P.PeerState,
		deadline: number,
	): Promise<PeerVerificationResult | undefined> {
		if (!(await this.#checkStateHeader(claimedState))) {
			return undefined;
		}

		const claimedHeight = Number(claimedState.header.height);
		const ourHeight: number = this.#ourHeight();
		if (await this.#weHavePeersHighestBlock(claimedState, ourHeight)) {
			// Case3 and Case5
			return new PeerVerificationResult(ourHeight, claimedHeight, claimedHeight);
		}

		const highestCommonBlockHeight = await this.#findHighestCommonBlockHeight(claimedHeight, ourHeight, deadline);
		if (highestCommonBlockHeight === undefined) {
			return undefined;
		}

		if (!(await this.#verifyPeerBlocks(highestCommonBlockHeight + 1, claimedHeight, deadline))) {
			return undefined;
		}

		this.#log(Severity.DEBUG_EXTRA, "success");

		return new PeerVerificationResult(ourHeight, claimedHeight, highestCommonBlockHeight);
	}

	async #checkStateHeader(claimedState: Contracts.P2P.PeerState): Promise<boolean> {
		const blockHeader: Contracts.Crypto.IBlockData = claimedState.header as Contracts.Crypto.IBlockData;
		const claimedHeight = Number(blockHeader.height);
		if (claimedHeight !== claimedState.height) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`Peer claimed contradicting heights: state height=${claimedState.height} vs ` +
					`state header height: ${claimedHeight}`,
			);
			return false;
		}

		try {
			const ownBlock: Contracts.Crypto.IBlock | undefined = this.app
				.get<Contracts.State.StateStore>(Identifiers.StateStore)
				.getLastBlocks()
				.find((block) => block.data.height === blockHeader.height);

			// Use shortcut to prevent expensive crypto if the block header equals our own.
			if (ownBlock && JSON.stringify(ownBlock.header) === JSON.stringify(blockHeader)) {
				return true;
			}

			if (claimedHeight < this.#ourHeight()) {
				// const roundInfo = Utils.roundCalculator.calculateRound(claimedHeight, this.configuration);
				// const validators = await this.#getValidatorsByRound(roundInfo);
				// if (await this.#verifyPeerBlock(blockHeader, claimedHeight, validators)) {
				// 	return true;
				// }
			} else {
				const claimedBlock: Contracts.Crypto.IBlock | undefined = await this.blockFactory.fromData(blockHeader);
				// TODO: Verify block signatures
				// if (claimedBlock && (await this.blockVerifier.verifySignature(claimedBlock))) {
				if (claimedBlock) {
					return true;
				}
			}

			this.#log(
				Severity.DEBUG_EXTRA,
				`Claimed block header ${blockHeader.height}:${blockHeader.id} failed signature verification`,
			);
			return false;
		} catch (error) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`Claimed block header ${blockHeader.height}:${blockHeader.id} failed verification: ` + error.message,
			);
			return false;
		}
	}

	#ourHeight(): number {
		let height: number | undefined;

		try {
			height = this.app.get<Contracts.State.StateStore>(Identifiers.StateStore).getLastHeight();

			assert(Number.isInteger(height));
		} catch {
			throw new Error(`Couldn't derive our chain height: ${height}`);
		}

		return height;
	}

	async #weHavePeersHighestBlock(claimedState: any, ourHeight: number): Promise<boolean> {
		const claimedHeight = Number(claimedState.header.height);

		if (claimedHeight > ourHeight) {
			const blocksAhead = claimedHeight - ourHeight;
			this.#log(
				Severity.DEBUG_EXTRA,
				`peer's claimed chain is ${pluralize("block", blocksAhead, true)} higher than ` +
					`ours (our height ${ourHeight}, his claimed height ${claimedHeight})`,
			);

			return false;
		}

		const blocks = await this.databaseService.findBlockByHeights([claimedHeight]);

		assert.strictEqual(
			blocks.length,
			1,
			`databaseService.findBlockByHeights([ ${claimedHeight} ]) returned ${blocks.length} results: ` +
				this.#anyToString(blocks) +
				` (our chain is at height ${ourHeight})`,
		);

		const ourBlockAtHisHeight = blocks[0];

		if (ourBlockAtHisHeight.data.id === claimedState.header.id) {
			if (claimedHeight === ourHeight) {
				this.#log(
					Severity.DEBUG_EXTRA,
					`success: peer's latest block is the same as our latest ` +
						`block (height=${claimedHeight}, id=${claimedState.header.id}). Identical chains.`,
				);
			} else {
				this.#log(
					Severity.DEBUG_EXTRA,
					`success: peer's latest block ` +
						`(height=${claimedHeight}, id=${claimedState.header.id}) is part of our chain. ` +
						`Peer is ${pluralize("block", ourHeight - claimedHeight, true)} behind us.`,
				);
			}
			return true;
		}

		this.#log(
			Severity.DEBUG,
			`peer's latest block (height=${claimedHeight}, id=${claimedState.header.id}), is different than the ` +
				`block at the same height in our chain (id=${ourBlockAtHisHeight.data.id}). Peer has ` +
				(claimedHeight < ourHeight ? `a shorter and` : `an equal-height but`) +
				` different chain.`,
		);

		return false;
	}

	async #findHighestCommonBlockHeight(
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
			const ourBlocks = await this.databaseService.findBlockByHeights(heightsToProbe);

			assert.strictEqual(ourBlocks.length, heightsToProbe.length);

			const probesIdByHeight = {};
			const probesHeightById = {};

			for (const b of ourBlocks) {
				probesIdByHeight[b.data.height] = b.data.id;
				probesHeightById[b.data.id] = b.data.height;
			}

			// Make sure getBlocksByHeight() returned a block for every height we asked.
			for (const height of heightsToProbe) {
				assert.strictEqual(typeof probesIdByHeight[height], "string");
			}

			const ourBlocksPrint = ourBlocks.map((b) => `{ height=${b.data.height}, id=${b.data.id} }`).join(", ");
			const rangePrint = `[${ourBlocks[0].data.height.toLocaleString()}, ${ourBlocks[
				ourBlocks.length - 1
			].data.height.toLocaleString()}]`;

			const msRemaining = this.#throwIfPastDeadline(deadline);

			this.#log(Severity.DEBUG_EXTRA, `probe for common blocks in range ${rangePrint}`);

			const highestCommon = await this.communicator.hasCommonBlocks(
				this.#peer,
				Object.keys(probesHeightById),
				msRemaining,
			);

			if (!highestCommon) {
				return undefined;
			}

			if (!probesHeightById[highestCommon.id]) {
				this.#log(
					Severity.DEBUG_EXTRA,
					`failure: bogus reply from peer for common blocks ${ourBlocksPrint}: ` +
						`peer replied with block id ${highestCommon.id} which we did not ask for`,
				);
				return undefined;
			}

			if (probesHeightById[highestCommon.id] !== highestCommon.height) {
				this.#log(
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
			this.#log(Severity.INFO, `failure: could not determine a common block`);
		} else {
			this.#log(Severity.DEBUG_EXTRA, `highest common block height: ${highestCommonBlockHeight}`);
		}

		return highestCommonBlockHeight;
	}

	async #verifyPeerBlocks(startHeight: number, claimedHeight: number, deadline: number): Promise<boolean> {
		const roundInfo = Utils.roundCalculator.calculateRound(startHeight, this.configuration);
		const { maxValidators, roundHeight } = roundInfo;
		const lastBlockHeightInRound = roundHeight + maxValidators - 1;

		// Verify a few blocks that are not too far up from the last common block. Within the
		// same round as the last common block or in the next round if the last common block is
		// the last block in a round (so that the validators calculations are still the same for
		// both chains).

		// const validators = await this.#getValidatorsByRound(roundInfo);

		const hisBlocksByHeight = {};

		const endHeight = Math.min(claimedHeight, lastBlockHeightInRound);

		for (let height = startHeight; height <= endHeight; height++) {
			if (
				hisBlocksByHeight[height] === undefined &&
				!(await this.#fetchBlocksFromHeight({
					blocksByHeight: hisBlocksByHeight,
					deadline,
					endHeight,
					height,
				}))
			) {
				return false;
			}
			assert(hisBlocksByHeight[height] !== undefined);

			// if (!this.#verifyPeerBlock(hisBlocksByHeight[height], height, validators)) {
			// 	return false;
			// }
		}

		return true;
	}

	// async #getValidatorsByRound(
	// 	roundInfo: Contracts.Shared.RoundInfo,
	// ): Promise<Record<string, Contracts.State.Wallet>> {
	// 	let validators: any = await this.app
	// 		.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
	// 		.call("getActiveValidators", { roundInfo });

	// 	if (validators.length === 0) {
	// 		// This must be the current round, still not saved into the database (it is saved
	// 		// only after it has completed). So fetch the list of validators from the wallet
	// 		// manager.
	// 		// ! looks like DoS attack vector
	// 		const dposRound = this.dposState.getRoundInfo();
	// 		assert.strictEqual(dposRound.round, roundInfo.round);
	// 		assert.strictEqual(dposRound.maxValidators, roundInfo.maxValidators);
	// 		validators = [...this.dposState.getRoundValidators()];
	// 	}

	// 	const validatorsByPublicKey: Record<string, Contracts.State.Wallet> = {};
	// 	for (const validator of validators) {
	// 		Utils.assert.defined<string>(validator.getPublicKey());
	// 		validatorsByPublicKey[validator.getPublicKey()!] = validator;
	// 	}
	// 	return validatorsByPublicKey;
	// }

	async #fetchBlocksFromHeight({
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
			this.#throwIfPastDeadline(deadline);

			// returns blocks from the next one, thus we do -1
			response = await this.communicator.getBlocks(this.#peer, {
				blockLimit: Math.max(Math.min(endHeight - height + 1, 400), 1),
				fromBlockHeight: height - 1,
				headersOnly: true,
			});
		} catch (error) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`failure: could not get blocks starting from height ${height} from peer: exception: ${error.message}`,
			);
			return false;
		}

		if (!response || response.length === 0) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`failure: could not get blocks starting from height ${height} ` +
					`from peer: unexpected response: ${this.#anyToString(response)}`,
			);
			return false;
		}

		for (const [index, element] of response.entries()) {
			blocksByHeight[height + index] = element;
		}

		return true;
	}

	// @ts-ignore
	async #verifyPeerBlock(
		blockData: Contracts.Crypto.IBlockData,
		expectedHeight: number,
		validatorsByPublicKey: Record<string, Contracts.State.Wallet>,
	): Promise<boolean> {
		const block: Contracts.Crypto.IBlock | undefined = await this.blockFactory.fromData(blockData);

		Utils.assert.defined<Contracts.Crypto.IBlock>(block);

		// TODO verify signatures
		// if (!(await this.blockVerifier.verifySignature(block))) {
		// 	this.#log(
		// 		Severity.DEBUG_EXTRA,
		// 		`failure: peer's block at height ${expectedHeight} does not pass crypto-validation`,
		// 	);
		// 	return false;
		// }

		const height = block.data.height;

		if (height !== expectedHeight) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`failure: asked for block at height ${expectedHeight}, but got a block with height ${height} instead`,
			);
			return false;
		}

		if (validatorsByPublicKey[block.data.generatorPublicKey]) {
			this.#log(
				Severity.DEBUG_EXTRA,
				`successfully verified block at height ${height}, signed by ` + block.data.generatorPublicKey,
			);

			return true;
		}

		this.#log(
			Severity.DEBUG_EXTRA,
			`failure: block ${this.#anyToString(blockData)} is not signed by any of the validators ` +
				`for the corresponding round: ` +
				this.#anyToString(Object.values(validatorsByPublicKey)),
		);

		return false;
	}

	#throwIfPastDeadline(deadline: number): number {
		const now = Date.now();

		if (deadline <= now) {
			// Throw an exception so that it can cancel everything and break out of peer.ping().
			throw new Error("timeout elapsed before successful completion of the verification");
		}

		return deadline - now;
	}

	#anyToString(value: any): string {
		return inspect(value, { breakLength: Number.POSITIVE_INFINITY, sorted: true });
	}

	#log(severity: Severity, message: string): void {
		const fullMessage = `${this.#logPrefix} ${message}`;
		switch (severity) {
			case Severity.DEBUG_EXTRA:
				if (process.env[Constants.Flags.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA]) {
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
