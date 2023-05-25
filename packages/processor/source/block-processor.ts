import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { AcceptBlockHandler } from "./handlers";
import { IncompatibleTransactionsVerifier, VerifyBlockVerifier } from "./verifiers";

@injectable()
export class BlockProcessor implements Contracts.BlockProcessor.Processor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Database.Service)
	private readonly databaseService: Contracts.Database.IDatabaseService;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public async process(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		if (!(await this.app.resolve(VerifyBlockVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(roundState))) {
			return false;
		}

		if (await this.#blockContainsOutOfOrderNonce(roundState)) {
			return false;
		}

		// const isValidGenerator: boolean = await this.#validateGenerator(block);
		const isChained: boolean = await AppUtils.isBlockChained(
			this.blockchain.getLastBlock().data,
			roundState.getProposal().toData().block.data,
			this.slots,
		);
		if (!isChained) {
			return false;
		}

		// if (!isValidGenerator) {
		// 	return this.app.resolve<InvalidGeneratorHandler>(InvalidGeneratorHandler).execute(block);
		// }

		const containsForgedTransactions: boolean = await this.#checkBlockContainsForgedTransactions(roundState);
		if (containsForgedTransactions) {
			return false;
		}

		return this.app.resolve<AcceptBlockHandler>(AcceptBlockHandler).execute(roundState);
	}

	async #checkBlockContainsForgedTransactions(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const block = roundState.getProposal().toData().block;
		if (block.transactions.length > 0) {
			const transactionIds = block.transactions.map((tx) => {
				AppUtils.assert.defined<string>(tx.id);

				return tx.id;
			});

			const forgedIds: string[] = await this.databaseService.getForgedTransactionsIds(transactionIds);

			if (this.stateStore.getLastBlock().data.height !== this.stateStore.getLastStoredBlockHeight()) {
				const transactionIdsSet = new Set<string>(transactionIds);

				for (const stateBlock of this.stateStore
					.getLastBlocks()
					.filter((block) => block.data.height > this.stateStore.getLastStoredBlockHeight())) {
					for (const tx of stateBlock.transactions) {
						AppUtils.assert.defined<string>(tx.id);

						if (transactionIdsSet.has(tx.id)) {
							forgedIds.push(tx.id);
						}
					}
				}
			}

			if (forgedIds.length > 0) {
				this.logger.warning(
					`Block ${block.data.height.toLocaleString()} disregarded, because it contains already forged transactions`,
				);

				this.logger.debug(`${JSON.stringify(forgedIds, undefined, 4)}`);

				return true;
			}
		}

		return false;
	}

	async #blockContainsOutOfOrderNonce(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const block = roundState.getProposal().toData().block;
		const nonceBySender = {};

		for (const transaction of block.transactions) {
			const data = transaction.data;

			if (data.version && data.version < 2) {
				break;
			}

			AppUtils.assert.defined<string>(data.senderPublicKey);

			const sender: string = data.senderPublicKey;

			if (nonceBySender[sender] === undefined) {
				const wallet = await this.walletRepository.findByPublicKey(sender);
				nonceBySender[sender] = wallet.getNonce();
			}

			AppUtils.assert.defined<string>(data.nonce);

			const nonce: BigNumber = BigNumber.make(data.nonce);

			if (!nonceBySender[sender].plus(1).isEqualTo(nonce)) {
				this.logger.warning(
					`Block { height: ${block.data.height.toLocaleString()}, id: ${block.data.id} } ` +
						`not accepted: invalid nonce order for sender ${sender}: ` +
						`preceding nonce: ${nonceBySender[sender].toFixed(0)}, ` +
						`transaction ${data.id} has nonce ${nonce.toFixed()}.`,
				);
				return true;
			}

			nonceBySender[sender] = nonce;
		}

		return false;
	}

	// @ts-ignore
	async #validateGenerator(block: Contracts.Crypto.IBlock): Promise<boolean> {
		const roundInfo: Contracts.Shared.RoundInfo = AppUtils.roundCalculator.calculateRound(
			block.data.height,
			this.configuration,
		);

		const validators: Contracts.State.Wallet[] = await this.triggers.call("getActiveValidators", {
			roundInfo,
		});

		const forgingInfo: Contracts.Shared.ForgingInfo = await AppUtils.forgingInfoCalculator.calculateForgingInfo(
			block.data.timestamp,
			block.data.height,
			this.app,
		);

		const forgingValidator: Contracts.State.Wallet = validators[forgingInfo.currentForger];

		const walletRepository = this.app.getTagged<Contracts.State.WalletRepository>(
			Identifiers.WalletRepository,
			"state",
			"blockchain",
		);
		const generatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			block.data.generatorPublicKey,
		);

		let generatorUsername: string;
		try {
			generatorUsername = generatorWallet.getAttribute("validator.username");
		} catch {
			return false;
		}

		if (!forgingValidator) {
			this.logger.debug(
				`Could not decide if validator ${generatorUsername} (${
					block.data.generatorPublicKey
				}) is allowed to forge block ${block.data.height.toLocaleString()}`,
			);
		} else if (forgingValidator.getPublicKey() !== block.data.generatorPublicKey) {
			AppUtils.assert.defined<string>(forgingValidator.getPublicKey());

			const forgingWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
				forgingValidator.getPublicKey()!,
			);
			const forgingUsername: string = forgingWallet.getAttribute("validator.username");

			this.logger.warning(
				`Validator ${generatorUsername} (${
					block.data.generatorPublicKey
				}) not allowed to forge, should be ${forgingUsername} (${forgingValidator.getPublicKey()})`,
			);

			return false;
		}

		this.logger.debug(
			`Validator ${generatorUsername} (${
				block.data.generatorPublicKey
			}) allowed to forge block ${block.data.height.toLocaleString()}`,
		);

		return true;
	}
}
