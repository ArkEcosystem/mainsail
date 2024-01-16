import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class Verifier implements Contracts.Crypto.BlockVerifier {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer!: Contracts.Crypto.BlockSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async verify(block: Contracts.Crypto.Block): Promise<Contracts.Crypto.BlockVerification> {
		const blockData: Contracts.Crypto.BlockData = block.data;
		const result: Utils.Mutable<Contracts.Crypto.BlockVerification> = {
			containsMultiSignatures: false,
			errors: [],
			verified: false,
		};

		try {
			const constants = this.configuration.getMilestone(blockData.height);

			if (
				blockData.height === 0 &&
				blockData.previousBlock !== "0000000000000000000000000000000000000000000000000000000000000000"
			) {
				result.errors.push("Genesis block has invalid previous block");
			}

			if (blockData.height !== 0 && !blockData.previousBlock) {
				result.errors.push("Invalid previous block");
			}

			if (!blockData.reward.isEqualTo(constants.reward)) {
				result.errors.push(
					["Invalid block reward:", blockData.reward, "expected:", constants.reward].join(" "),
				);
			}

			if (blockData.version !== constants.block.version) {
				result.errors.push("Invalid block version");
			}

			const size: number = this.serializer.totalSize(blockData);
			if (size > constants.block.maxPayload) {
				result.errors.push(`Payload is too large: ${size} > ${constants.block.maxPayload}`);
			}

			if (block.transactions.length !== blockData.numberOfTransactions) {
				result.errors.push("Invalid number of transactions");
			}

			if (block.transactions.length > constants.block.maxTransactions && blockData.height > 0) {
				result.errors.push("Transactions length is too high");
			}

			// Checking if transactions of the block adds up to block values.
			const appliedTransactions: Record<string, Contracts.Crypto.TransactionData> = {};

			let totalAmount: BigNumber = BigNumber.ZERO;
			let totalFee: BigNumber = BigNumber.ZERO;

			// The initial payload length takes the overhead for each serialized transaction into account
			// which is a uint32 per transaction to store the individual length.
			let totalPayloadLength = 4 * block.transactions.length;

			const payloadBuffers: Buffer[] = [];
			for (const transaction of block.transactions) {
				if (!transaction || !transaction.id) {
					throw new Error();
				}

				const bytes: Buffer = Buffer.from(transaction.id, "hex");

				if (appliedTransactions[transaction.id]) {
					result.errors.push(`Encountered duplicate transaction: ${transaction.id}`);
				}

				if (
					transaction.data.expiration &&
					transaction.data.expiration > 0 &&
					transaction.data.expiration <= blockData.height
				) {
					result.errors.push(`Encountered expired transaction: ${transaction.id}`);
				}

				appliedTransactions[transaction.id] = transaction.data;

				totalAmount = totalAmount.plus(transaction.data.amount);
				totalFee = totalFee.plus(transaction.data.fee);
				totalPayloadLength += transaction.serialized.length;

				payloadBuffers.push(bytes);
			}

			if (!totalAmount.isEqualTo(blockData.totalAmount)) {
				result.errors.push("Invalid total amount");
			}

			if (!totalFee.isEqualTo(blockData.totalFee)) {
				result.errors.push("Invalid total fee");
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
