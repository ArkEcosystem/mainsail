import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class Verifier implements Contracts.Crypto.IBlockVerifier {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier: Contracts.Crypto.ITransactionVerifier;

	public async verify(block: Contracts.Crypto.IBlock): Promise<Contracts.Crypto.IBlockVerification> {
		const blockData: Contracts.Crypto.IBlockData = block.data;
		const result: Contracts.Crypto.IBlockVerification = {
			containsMultiSignatures: false,
			errors: [],
			verified: false,
		};

		try {
			const constants = this.configuration.getMilestone(blockData.height);

			if (blockData.height !== 1 && !blockData.previousBlock) {
				result.errors.push("Invalid previous block");
			}

			if (!blockData.reward.isEqualTo(constants.reward)) {
				result.errors.push(
					["Invalid block reward:", blockData.reward, "expected:", constants.reward].join(" "),
				);
			}

			const valid = this.verifySignature(block);

			if (!valid) {
				result.errors.push("Failed to verify block signature");
			}

			if (blockData.version !== constants.block.version) {
				result.errors.push("Invalid block version");
			}

			if (
				blockData.timestamp >
				this.slots.getTime() + this.configuration.getMilestone(blockData.height).blockTime
			) {
				result.errors.push("Invalid block timestamp");
			}

			const size: number = this.serializer.size(block);
			if (size > constants.block.maxPayload) {
				result.errors.push(`Payload is too large: ${size} > ${constants.block.maxPayload}`);
			}

			const invalidTransactions: Contracts.Crypto.ITransaction[] = [];

			for (const transaction of block.transactions) {
				if (!(await this.transactionVerifier.verifyHash(transaction.data))) {
					invalidTransactions.push(transaction);
				}
			}

			if (invalidTransactions.length > 0) {
				result.errors.push("One or more transactions are not verified:");

				for (const invalidTransaction of invalidTransactions) {
					result.errors.push(`=> ${invalidTransaction.serialized.toString("hex")}`);
				}

				result.containsMultiSignatures = invalidTransactions.some((tx) => !!tx.data.signatures);
			}

			if (block.transactions.length !== blockData.numberOfTransactions) {
				result.errors.push("Invalid number of transactions");
			}

			if (block.transactions.length > constants.block.maxTransactions && blockData.height > 1) {
				result.errors.push("Transactions length is too high");
			}

			// Checking if transactions of the block adds up to block values.
			const appliedTransactions: Record<string, Contracts.Crypto.ITransactionData> = {};

			let totalAmount: BigNumber = BigNumber.ZERO;
			let totalFee: BigNumber = BigNumber.ZERO;

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

				payloadBuffers.push(bytes);
			}

			if (!totalAmount.isEqualTo(blockData.totalAmount)) {
				result.errors.push("Invalid total amount");
			}

			if (!totalFee.isEqualTo(blockData.totalFee)) {
				result.errors.push("Invalid total fee");
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

	public async verifySignature(block: Contracts.Crypto.IBlock): Promise<boolean> {
		const bytes: Buffer = await this.serializer.serialize(block.data, false);
		const hash: Buffer = await this.hashFactory.sha256(bytes);

		if (!block.data.blockSignature) {
			throw new Error();
		}

		return this.signatureFactory.verify(
			hash,
			Buffer.from(block.data.blockSignature, "hex"),
			Buffer.from(block.data.generatorPublicKey, "hex"),
		);
	}
}
