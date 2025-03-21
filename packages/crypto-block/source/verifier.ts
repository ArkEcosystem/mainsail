import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Verifier implements Contracts.Crypto.BlockVerifier {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	public async verify(block: Contracts.Crypto.Block): Promise<Contracts.Crypto.BlockVerification> {
		const blockData: Contracts.Crypto.BlockData = block.data;
		const result: Utils.Mutable<Contracts.Crypto.BlockVerification> = {
			containsMultiSignatures: false,
			errors: [],
			verified: false,
		};

		try {
			const milestone = this.configuration.getMilestone(blockData.height);

			const totalSize = this.headerSize() + block.header.payloadLength;
			if (totalSize > milestone.block.maxPayload) {
				result.errors.push(`Payload is too large: ${totalSize} > ${milestone.block.maxPayload}`);
			}

			if (totalSize !== Buffer.byteLength(block.serialized, "hex")) {
				result.errors.push("Serialized payload size mismatch");
			}

			if (block.transactions.length !== blockData.numberOfTransactions) {
				result.errors.push("Invalid number of transactions");
			}

			// Checking if transactions of the block adds up to block values.
			const appliedTransactions: Record<string, Contracts.Crypto.TransactionData> = {};

			let totalAmount: BigNumber = BigNumber.ZERO;

			// The initial payload length takes the overhead for each serialized transaction into account
			// which is a uint32 per transaction to store the individual length.
			let totalPayloadLength = block.transactions.length * 4;

			const payloadBuffers: Buffer[] = [];
			for (const transaction of block.transactions) {
				if (!transaction || !transaction.id) {
					throw new Error();
				}

				const bytes: Buffer = Buffer.from(transaction.id, "hex");

				if (appliedTransactions[transaction.id]) {
					result.errors.push(`Encountered duplicate transaction: ${transaction.id}`);
				}

				appliedTransactions[transaction.id] = transaction.data;

				totalAmount = totalAmount.plus(transaction.data.value);
				totalPayloadLength += transaction.serialized.byteLength;

				payloadBuffers.push(bytes);
			}

			if (!totalAmount.isEqualTo(blockData.totalAmount)) {
				result.errors.push("Invalid total amount");
			}

			if (totalPayloadLength !== blockData.payloadLength) {
				result.errors.push("Invalid payload length");
			}

			if ((await this.hashFactory.sha256(payloadBuffers)).toString("hex") !== blockData.payloadHash) {
				result.errors.push("Invalid payload hash");
			}
		} catch (error) {
			result.errors.push(error);
		}

		result.verified = result.errors.length === 0;

		return result;
	}
}
