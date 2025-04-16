import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class LegacyAttributeVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const senders = new Map<string, Contracts.Evm.LegacyAttributes | null>();

		for (const transaction of unit.getBlock().transactions) {
			const { from, legacySecondSignature, senderLegacyAddress } = transaction.data;
			if (!senders.has(from)) {
				senders[from] = await this.evm.getLegacyAttributes(from, senderLegacyAddress);
			}

			const legacyAttributes = senders.get(from);

			if (!legacyAttributes?.secondPublicKey) {
				if (legacySecondSignature) {
					throw new Exceptions.UnexpectedLegacySecondSignatureError();
				}

				continue;
			}

			await this.transactionVerifier.verifyLegacySecondSignature(
				transaction.data,
				legacyAttributes.secondPublicKey,
			);
		}
	}
}
