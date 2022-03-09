import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class Block implements Contracts.Crypto.IBlock {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	//  - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: string;
	public data: Contracts.Crypto.IBlockData;
	public transactions: Contracts.Crypto.ITransaction[];
	public verification: Contracts.Crypto.IBlockVerification;

	public async init({
		data,
		transactions,
		id,
	}: {
		data: Contracts.Crypto.IBlockData;
		transactions: Contracts.Crypto.ITransaction[];
		id?: string;
	}) {
		this.data = data;

		// fix on real timestamp, this is overloading transaction
		// timestamp with block timestamp for storage only
		// also add sequence to keep database sequence
		this.transactions = transactions.map((transaction, index) => {
			transaction.data.blockId = this.data.id;
			transaction.data.blockHeight = this.data.height;
			transaction.data.sequence = index;
			transaction.timestamp = this.data.timestamp;
			return transaction;
		});

		delete this.data.transactions;

		this.verification = await this.verify();

		return this;
	}

	public getHeader(): Contracts.Crypto.IBlockData {
		const header: Contracts.Crypto.IBlockData = Object.assign({}, this.data);

		delete header.transactions;

		return header;
	}

	public async verifySignature(): Promise<boolean> {
		const bytes: Buffer = await this.serializer.serialize(this.data, false);
		const hash: Buffer = await this.hashFactory.sha256(bytes);

		if (!this.data.blockSignature) {
			throw new Error();
		}

		return this.signatureFactory.verify(
			hash,
			Buffer.from(this.data.blockSignature, "hex"),
			Buffer.from(this.data.generatorPublicKey, "hex"),
		);
	}

	public toJson(): Contracts.Crypto.IBlockJson {
		const data: Contracts.Crypto.IBlockJson = JSON.parse(JSON.stringify(this.data));
		data.reward = this.data.reward.toString();
		data.totalAmount = this.data.totalAmount.toString();
		data.totalFee = this.data.totalFee.toString();
		data.transactions = this.transactions.map((transaction) => transaction.toJson());

		return data;
	}

	public async verify(): Promise<Contracts.Crypto.IBlockVerification> {
		const block: Contracts.Crypto.IBlockData = this.data;
		const result: Contracts.Crypto.IBlockVerification = {
			containsMultiSignatures: false,
			errors: [],
			verified: false,
		};

		try {
			const constants = this.configuration.getMilestone(block.height);

			if (block.height !== 1 && !block.previousBlock) {
				result.errors.push("Invalid previous block");
			}

			if (!block.reward.isEqualTo(constants.reward)) {
				result.errors.push(["Invalid block reward:", block.reward, "expected:", constants.reward].join(" "));
			}

			const valid = this.verifySignature();

			if (!valid) {
				result.errors.push("Failed to verify block signature");
			}

			if (block.version !== constants.block.version) {
				result.errors.push("Invalid block version");
			}

			if (block.timestamp > this.slots.getTime() + this.configuration.getMilestone(block.height).blocktime) {
				result.errors.push("Invalid block timestamp");
			}

			const size: number = this.serializer.size(this);
			if (size > constants.block.maxPayload) {
				result.errors.push(`Payload is too large: ${size} > ${constants.block.maxPayload}`);
			}

			const invalidTransactions: Contracts.Crypto.ITransaction[] = this.transactions.filter((tx) => !tx.verified);
			if (invalidTransactions.length > 0) {
				result.errors.push("One or more transactions are not verified:");

				for (const invalidTransaction of invalidTransactions) {
					result.errors.push(`=> ${invalidTransaction.serialized.toString("hex")}`);
				}

				result.containsMultiSignatures = invalidTransactions.some((tx) => !!tx.data.signatures);
			}

			if (this.transactions.length !== block.numberOfTransactions) {
				result.errors.push("Invalid number of transactions");
			}

			if (this.transactions.length > constants.block.maxTransactions && block.height > 1) {
				result.errors.push("Transactions length is too high");
			}

			// Checking if transactions of the block adds up to block values.
			const appliedTransactions: Record<string, Contracts.Crypto.ITransactionData> = {};

			let totalAmount: BigNumber = BigNumber.ZERO;
			let totalFee: BigNumber = BigNumber.ZERO;

			const payloadBuffers: Buffer[] = [];
			for (const transaction of this.transactions) {
				if (!transaction.data || !transaction.data.id) {
					throw new Error();
				}

				const bytes: Buffer = Buffer.from(transaction.data.id, "hex");

				if (appliedTransactions[transaction.data.id]) {
					result.errors.push(`Encountered duplicate transaction: ${transaction.data.id}`);
				}

				if (
					transaction.data.expiration &&
					transaction.data.expiration > 0 &&
					transaction.data.expiration <= this.data.height
				) {
					result.errors.push(`Encountered expired transaction: ${transaction.data.id}`);
				}

				appliedTransactions[transaction.data.id] = transaction.data;

				totalAmount = totalAmount.plus(transaction.data.amount);
				totalFee = totalFee.plus(transaction.data.fee);

				payloadBuffers.push(bytes);
			}

			if (!totalAmount.isEqualTo(block.totalAmount)) {
				result.errors.push("Invalid total amount");
			}

			if (!totalFee.isEqualTo(block.totalFee)) {
				result.errors.push("Invalid total fee");
			}

			if ((await this.hashFactory.sha256(payloadBuffers)).toString("hex") !== block.payloadHash) {
				result.errors.push("Invalid payload hash");
			}
		} catch (error) {
			result.errors.push(error);
		}

		result.verified = result.errors.length === 0;

		return result;
	}
}
