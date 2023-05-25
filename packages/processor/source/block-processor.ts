import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Utils as AppUtils } from "@mainsail/kernel";

import { AcceptBlockHandler } from "./handlers";
import {
	ChainedVerifier,
	ForgedTransactionsVerifier,
	IncompatibleTransactionsVerifier,
	NonceVerifier,
	VerifyBlockVerifier,
} from "./verifiers";

@injectable()
export class BlockProcessor implements Contracts.BlockProcessor.Processor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async process(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		if (!(await this.app.resolve(VerifyBlockVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(NonceVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(ChainedVerifier).execute(roundState))) {
			return false;
		}

		// if (!isValidGenerator) {
		// 	return this.app.resolve<InvalidGeneratorHandler>(InvalidGeneratorHandler).execute(block);
		// }

		if (!(await this.app.resolve(ForgedTransactionsVerifier).execute(roundState))) {
			return false;
		}

		return this.app.resolve<AcceptBlockHandler>(AcceptBlockHandler).execute(roundState);
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
