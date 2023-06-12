// @ts-nocheck
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class ValidatorVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		// const block = roundState.getProposal()?.block;
		// Utils.assert.defined<Contracts.Crypto.IBlock>(block);

		// const roundInfo: Contracts.Shared.RoundInfo = Utils.roundCalculator.calculateRound(
		// 	block.data.height,
		// 	this.configuration,
		// );

		// const validators = await this.triggers.call<Contracts.State.Wallet[]>("getActiveValidators", {
		// 	roundInfo,
		// });
		// Utils.assert.defined<Contracts.State.Wallet[]>(validators);

		// // TODO: Fix
		// const forgingValidator: Contracts.State.Wallet = validators[0];

		// const walletRepository = this.app.getTagged<Contracts.State.WalletRepository>(
		// 	Identifiers.WalletRepository,
		// 	"state",
		// 	"blockchain",
		// );
		// const generatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
		// 	block.data.generatorPublicKey,
		// );

		// let generatorUsername: string;
		// try {
		// 	generatorUsername = generatorWallet.getAttribute("validator.username");
		// } catch {
		// 	return false;
		// }

		// if (!forgingValidator) {
		// 	this.logger.debug(
		// 		`Could not decide if validator ${generatorUsername} (${
		// 			block.data.generatorPublicKey
		// 		}) is allowed to forge block ${block.data.height.toLocaleString()}`,
		// 	);
		// } else if (forgingValidator.getPublicKey() !== block.data.generatorPublicKey) {
		// 	Utils.assert.defined<string>(forgingValidator.getPublicKey());

		// 	const forgingWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
		// 		forgingValidator.getPublicKey()!,
		// 	);
		// 	const forgingUsername: string = forgingWallet.getAttribute("validator.username");

		// 	this.logger.warning(
		// 		`Validator ${generatorUsername} (${
		// 			block.data.generatorPublicKey
		// 		}) not allowed to forge, should be ${forgingUsername} (${forgingValidator.getPublicKey()})`,
		// 	);

		// 	return false;
		// }

		// this.logger.debug(
		// 	`Validator ${generatorUsername} (${
		// 		block.data.generatorPublicKey
		// 	}) allowed to forge block ${block.data.height.toLocaleString()}`,
		// );

		// return true;
	}
}
