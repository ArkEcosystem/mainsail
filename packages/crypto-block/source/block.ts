import { HashFactory } from "@arkecosystem/crypto-hash-bcrypto";
import { Signatory } from "@arkecosystem/crypto-signature-ecdsa";
import { Slots } from "@arkecosystem/crypto-time";
import { BlockSchemaError } from "@arkecosystem/crypto-errors";
import {
	IBlock,
	IBlockData,
	IBlockJson,
	IBlockVerification,
	ITransaction,
	ITransactionData,
} from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { Validator } from "@arkecosystem/validation";
import { Serializer } from "./serializer";
import { Configuration } from "@packages/crypto-config/distribution";

export class Block implements IBlock {
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: string;
	public data: IBlockData;
	public transactions: ITransaction[];
	public verification: IBlockVerification;

	readonly #configuration: Configuration;

	public constructor(
		configuration: Configuration,
		{ data, transactions, id }: { data: IBlockData; transactions: ITransaction[]; id?: string },
	) {
		this.#configuration = configuration;
		this.data = data;

		// TODO genesis block calculated id is wrong for some reason
		if (this.data.height === 1) {
			if (id) {
				this.applyGenesisBlockFix(id);
			} else if (data.id) {
				this.applyGenesisBlockFix(data.id);
			}
		}

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

		this.verification = void this.verify();
	}

	public async applySchema(data: IBlockData): Promise<IBlockData | undefined> {
		let result = await new Validator({}).validate("block", data);

		if (!result.error) {
			return result.value;
		}

		for (const err of result.errors) {
			let fatal = false;

			const match = err.dataPath.match(/\.transactions\[(\d+)]/);
			if (match === null) {
				fatal = true;
			} else {
				const txIndex = match[1];

				if (data.transactions) {
					const tx = data.transactions[txIndex];

					if (tx.id === undefined) {
						fatal = true;
					}
				}
			}

			if (fatal) {
				throw new BlockSchemaError(
					data.height,
					`Invalid data${err.dataPath ? " at " + err.dataPath : ""}: ` +
						`${err.message}: ${JSON.stringify(err.data)}`,
				);
			}
		}

		return result.value;
	}

	public async getIdHex(data: IBlockData): Promise<string> {
		const constants = this.#configuration.getMilestone(data.height);
		const payloadHash: Buffer = new Serializer(this.#configuration).serialize(data);

		const hash: Buffer = await new HashFactory().sha256(payloadHash);

		if (constants.block.idFullSha256) {
			return hash.toString("hex");
		}

		const temp: Buffer = Buffer.alloc(8);

		for (let i = 0; i < 8; i++) {
			temp[i] = hash[7 - i];
		}

		return temp.toString("hex");
	}

	public toBytesHex(data): string {
		const temp: string = data ? BigNumber.make(data).toString(16) : "";

		return "0".repeat(16 - temp.length) + temp;
	}

	public getId(data: IBlockData): string {
		const constants = this.#configuration.getMilestone(data.height);
		// @ts-ignore
		const idHex: string = new Block(this.#configuration, {}).getIdHex(data);

		return constants.block.idFullSha256 ? idHex : BigNumber.make(`0x${idHex}`).toString();
	}

	public getHeader(): IBlockData {
		const header: IBlockData = Object.assign({}, this.data);
		delete header.transactions;

		return header;
	}

	public async verifySignature(): Promise<boolean> {
		const bytes: Buffer = new Serializer(this.#configuration).serialize(this.data, false);
		const hash: Buffer = await new HashFactory().sha256(bytes);

		if (!this.data.blockSignature) {
			throw new Error();
		}

		return new Signatory().verify(
			hash,
			Buffer.from(this.data.blockSignature, "hex"),
			Buffer.from(this.data.generatorPublicKey, "hex"),
		);
	}

	public toJson(): IBlockJson {
		const data: IBlockJson = JSON.parse(JSON.stringify(this.data));
		data.reward = this.data.reward.toString();
		data.totalAmount = this.data.totalAmount.toString();
		data.totalFee = this.data.totalFee.toString();
		data.transactions = this.transactions.map((transaction) => transaction.toJson());

		return data;
	}

	public async verify(): Promise<IBlockVerification> {
		const block: IBlockData = this.data;
		const result: IBlockVerification = {
			containsMultiSignatures: false,
			errors: [],
			verified: false,
		};

		try {
			const constants = this.#configuration.getMilestone(block.height);

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

			if (
				block.timestamp >
				new Slots(this.#configuration, {}).getTime() + this.#configuration.getMilestone(block.height).blocktime
			) {
				result.errors.push("Invalid block timestamp");
			}

			const size: number = new Serializer(this.#configuration).size(this);
			if (size > constants.block.maxPayload) {
				result.errors.push(`Payload is too large: ${size} > ${constants.block.maxPayload}`);
			}

			const invalidTransactions: ITransaction[] = this.transactions.filter((tx) => !tx.verified);
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
			const appliedTransactions: Record<string, ITransactionData> = {};

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

				if (transaction.data.version === 1) {
					const now: number = block.timestamp;
					if (transaction.data.timestamp > now + 3600 + constants.blocktime) {
						result.errors.push(`Encountered future transaction: ${transaction.data.id}`);
					} else if (now - transaction.data.timestamp > 21_600) {
						result.errors.push(`Encountered expired transaction: ${transaction.data.id}`);
					}
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

			// @ts-ignore
			if ((await new HashFactory().sha256(payloadBuffers)).toString("hex") !== block.payloadHash) {
				result.errors.push("Invalid payload hash");
			}
		} catch (error) {
			result.errors.push(error);
		}

		result.verified = result.errors.length === 0;

		return result;
	}

	private applyGenesisBlockFix(id: string): void {
		this.data.id = id;
		// @ts-ignore
		this.data.idHex = id.length === 64 ? id : new Block(this.#configuration, {}).toBytesHex(id); // if id.length is 64 it's already hex
	}
}
