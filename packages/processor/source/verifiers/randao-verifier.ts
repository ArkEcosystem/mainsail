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

		// The reveal is checked against the proposer's BLS key in the active round snapshot —
		// the same key all of the proposer's consensus messages are verified against. BLS
		// signatures are unique per (key, message), so a valid reveal is the only value the
		// proposer could have produced for this height.
		//
		// Design invariant: uniqueness holds for the signature POINT, while the on-chain mix
		// hashes the reveal BYTES. The blst backend rejects non-canonical point encodings in
		// verify(), which makes bytes and point one-to-one. If the BLS backend is ever
		// swapped (a herumi fallback exists), it must keep rejecting any reveal whose bytes
		// differ from the canonical serialization of the decoded point — otherwise a proposer
		// could grind among alternate encodings of the same valid signature.
		const proposer = this.validatorSet.getValidator(
			this.validatorSet.getValidatorIndexByWalletAddress(block.proposer),
		);

		const valid = await this.consensusSignature.verify(
			Buffer.from(block.randaoReveal, "hex"),
			randaoMessage(this.stateStore.getGenesisCommit().block.hash, block.number),
			Buffer.from(proposer.blsPublicKey, "hex"),
		);

		if (!valid) {
			throw new InvalidRandaoReveal(block);
		}
	}
}
