import type { Contracts } from "@mainsail/contracts";

import { randaoMessage } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { InvalidRandaoReveal } from "@mainsail/exceptions";

@injectable()
export class RandaoVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.SignatureBls;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const proposer = this.validatorSet.getValidator(
			this.validatorSet.getValidatorIndexByWalletAddress(block.proposer),
		);

		const valid = await this.consensusSignature.verify(
			Buffer.from(block.randaoReveal, "hex"),
			randaoMessage(
				this.stateStore.getGenesisCommit().block.hash,
				this.stateStore.getLastBlock().randaoReveal,
				block.number,
			),
			Buffer.from(proposer.blsPublicKey, "hex"),
		);

		if (!valid) {
			throw new InvalidRandaoReveal(block);
		}
	}
}
