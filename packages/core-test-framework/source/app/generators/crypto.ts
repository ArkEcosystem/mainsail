// import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
// import { Types } from "@arkecosystem/core-kernel";
// import { BigNumber } from "@arkecosystem/utils";
// import { ByteBuffer } from "@arkecosystem/utils";
import { ensureDirSync, existsSync } from "fs-extra";
import { resolve } from "path";
import { dirSync } from "tmp";

import { CryptoConfigPaths } from "../contracts";
import { Generator } from "./generator";

export class CryptoGenerator extends Generator {
	private destination!: string;

	public generate(): CryptoConfigPaths {
		this.destination = resolve(__dirname, `${dirSync().name}/${this.options.crypto.flags.network}`);

		if (existsSync(this.destination)) {
			throw new Error(`${this.destination} already exists.`);
		}

		ensureDirSync(this.destination);

		// const genesisBlock =
		// 	this.options.crypto.genesisBlock ??
		// 	this.generateGenesisBlock(
		// 		this.createWallet(this.options.crypto.flags.pubKeyHash),
		// 		this.generateCoreValidators(this.options.crypto.flags.validators, this.options.crypto.flags.pubKeyHash),
		// 		this.options.crypto.flags.pubKeyHash,
		// 		this.options.crypto.flags.premine,
		// 		this.options.crypto.flags.distribute,
		// 	);

		// this.writeExceptions();

		// this.writeGenesisBlock(genesisBlock);

		// this.writeMilestones(genesisBlock);

		// this.writeNetwork(genesisBlock.payloadHash);

		return {
			crypto: resolve(this.destination, "crypto.json"),
			root: this.destination,
		};
	}

	// private generateNetwork(
	// 	name: string,
	// 	pubKeyHash: number,
	// 	nethash: string,
	// 	wif: number,
	// 	token: string,
	// 	symbol: string,
	// 	explorer: string,
	// ) {
	// 	return {
	// 		aip20: 0,
	// 		bip32: {
	// 			private: 70_615_956,
	// 			public: 70_617_039,
	// 		},
	// 		client: {
	// 			explorer,
	// 			symbol,
	// 			token,
	// 		},
	// 		messagePrefix: `${name} message:\n`,
	// 		name,
	// 		nethash,
	// 		pubKeyHash,
	// 		slip44: 1,
	// 		wif,
	// 	};
	// }

	// private generateMilestones(
	// 	activeValidators: number,
	// 	blockTime: number,
	// 	maxTransactions: number,
	// 	maxPayload: number,
	// 	rewardHeight: number,
	// 	rewardAmount: number,
	// ) {
	// 	return [
	// 		{
	// 			activeValidators,
	// 			block: {
	// 				maxPayload,
	// 				maxTransactions,
	// 				version: 0,
	// 			},
	// 			blockTime,
	// 			epoch: "2017-03-21T13:00:00.000Z",
	// 			fees: {
	// 				staticFees: {
	// 					validatorRegistration: 2_500_000_000,
	// 					validatorResignation: 2_500_000_000,
	// 					multiPayment: 10_000_000,
	// 					multiSignature: 500_000_000,
	// 					transfer: 10_000_000,
	// 					vote: 100_000_000,
	// 				},
	// 			},
	// 			height: 1,
	// 			multiPaymentLimit: 256,
	// 			reward: 0,
	// 			vendorFieldLength: 64,
	// 		},
	// 		{
	// 			height: rewardHeight,
	// 			reward: rewardAmount,
	// 		},
	// 		{
	// 			height: 100_000,
	// 			vendorFieldLength: 255,
	// 		},
	// 	];
	// }

	// private generateGenesisBlock(
	// 	genesisWallet,
	// 	validators,
	// 	pubKeyHash: number,
	// 	totalPremine: string,
	// 	distribute: boolean,
	// ) {
	// 	const premineWallet: Wallet = this.createWallet(pubKeyHash);

	// 	let transactions = [];

	// 	if (distribute) {
	// 		transactions = transactions.concat(
	// 			...this.createTransferTransactions(premineWallet, validators, totalPremine, pubKeyHash),
	// 		);
	// 	} else {
	// 		transactions = transactions.concat(
	// 			this.createTransferTransaction(premineWallet, genesisWallet, totalPremine, pubKeyHash),
	// 		);
	// 	}

	// 	transactions = transactions.concat(
	// 		...this.buildValidatorTransactions(validators, pubKeyHash),
	// 		...this.buildVoteTransactions(validators, pubKeyHash),
	// 	);

	// 	return this.createGenesisBlock(premineWallet.keys, transactions, 0);
	// }

	// private createTransferTransaction(sender: Wallet, recipient: Wallet, amount: string, pubKeyHash: number): any {
	// 	return this.formatGenesisTransaction(
	// 		Transactions.BuilderFactory.transfer()
	// 			.network(pubKeyHash)
	// 			.recipientId(recipient.address)
	// 			.amount(amount)
	// 			.sign(sender.passphrase).data,
	// 		sender,
	// 	);
	// }

	// private createTransferTransactions(
	// 	sender: Wallet,
	// 	recipients: Wallet[],
	// 	totalPremine: string,
	// 	pubKeyHash: number,
	// ): any {
	// 	const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

	// 	return recipients.map((recipientWallet: Wallet) =>
	// 		this.createTransferTransaction(sender, recipientWallet, amount, pubKeyHash),
	// 	);
	// }

	// private buildValidatorTransactions(senders: Wallet[], pubKeyHash: number) {
	// 	return senders.map((sender: Wallet) =>
	// 		this.formatGenesisTransaction(
	// 			Transactions.BuilderFactory.validatorRegistration()
	// 				.network(pubKeyHash)
	// 				.usernameAsset(sender.username)
	// 				.fee(`${25 * 1e8}`)
	// 				.sign(sender.passphrase).data,
	// 			sender,
	// 		),
	// 	);
	// }

	// private buildVoteTransactions(senders: Wallet[], pubKeyHash: number) {
	// 	return senders.map((sender: Wallet) =>
	// 		this.formatGenesisTransaction(
	// 			Transactions.BuilderFactory.vote()
	// 				.network(pubKeyHash)
	// 				.votesAsset([`+${sender.keys.publicKey}`])
	// 				.fee(`${1 * 1e8}`)
	// 				.sign(sender.passphrase).data,
	// 			sender,
	// 		),
	// 	);
	// }

	// private formatGenesisTransaction(transaction, wallet: Wallet) {
	// 	Object.assign(transaction, {
	// 		fee: BigNumber.make("0"),
	// 		timestamp: 0,
	// 	});

	// 	transaction.signature = Transactions.Signer.sign(transaction, wallet.keys);
	// 	transaction.id = Transactions.Utils.getId(transaction);

	// 	return transaction;
	// }

	// private createGenesisBlock(keys: Contracts.Crypto.IKeyPair, transactions, timestamp: number) {
	// 	transactions = transactions.sort((a, b) => {
	// 		if (a.type === b.type) {
	// 			return a.amount - b.amount;
	// 		}

	// 		return a.type - b.type;
	// 	});

	// 	let payloadLength = 0;
	// 	let totalFee: BigNumber = BigNumber.ZERO;
	// 	let totalAmount: BigNumber = BigNumber.ZERO;
	// 	const allBytes: Buffer[] = [];

	// 	for (const transaction of transactions) {
	// 		const bytes: Buffer = Transactions.Serializer.getBytes(transaction);

	// 		allBytes.push(bytes);

	// 		payloadLength += bytes.length;
	// 		totalFee = totalFee.plus(transaction.fee);
	// 		totalAmount = totalAmount.plus(BigNumber.make(transaction.amount));
	// 	}

	// 	const payloadHash: Buffer = Crypto.HashAlgorithms.sha256(Buffer.concat(allBytes));

	// 	const block: any = {
	// 		// @ts-ignore
	// 		generatorPublicKey: keys.publicKey.toString("hex"),

	// 		numberOfTransactions: transactions.length,

	// 		height: 1,

	// 		payloadHash: payloadHash.toString("hex"),

	// 		blockSignature: undefined,

	// 		payloadLength,

	// 		id: undefined,

	// 		reward: "0",

	// 		previousBlock: null,

	// 		totalAmount: totalAmount.toString(),
	// 		timestamp,
	// 		version: 0,
	// 		totalFee: totalFee.toString(),
	// 		transactions,
	// 	};

	// 	block.id = this.getBlockId(block);

	// 	block.blockSignature = this.signBlock(block, keys);

	// 	return block;
	// }

	// private getBlockId(block): string {
	// 	const hash: Buffer = this.getHash(block);
	// 	const blockBuffer: Buffer = Buffer.alloc(8);

	// 	for (let index = 0; index < 8; index++) {
	// 		blockBuffer[index] = hash[7 - index];
	// 	}

	// 	return BigNumber.make(`0x${blockBuffer.toString("hex")}`).toString();
	// }

	// private signBlock(block, keys: Contracts.Crypto.IKeyPair): string {
	// 	return Crypto.Hash.signECDSA(this.getHash(block), keys);
	// }

	// private getHash(block): Buffer {
	// 	return Crypto.HashAlgorithms.sha256(this.getBytes(block));
	// }

	// private getBytes(genesisBlock): Buffer {
	// 	const size = 4 + 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 64;

	// 	const byteBuffer = new ByteBuffer(size, true);
	// 	byteBuffer.writeInt(genesisBlock.version);
	// 	byteBuffer.writeInt(genesisBlock.timestamp);
	// 	byteBuffer.writeInt(genesisBlock.height);

	// 	for (let index = 0; index < 8; index++) {
	// 		byteBuffer.writeByte(0); // no previous block
	// 	}

	// 	byteBuffer.writeInt(genesisBlock.numberOfTransactions);
	// 	byteBuffer.writeLong(genesisBlock.totalAmount);
	// 	byteBuffer.writeLong(genesisBlock.totalFee);
	// 	byteBuffer.writeLong(genesisBlock.reward);

	// 	byteBuffer.writeInt(genesisBlock.payloadLength);

	// 	for (const payloadHashByte of Buffer.from(genesisBlock.payloadHash, "hex")) {
	// 		byteBuffer.writeByte(payloadHashByte);
	// 	}

	// 	for (const generatorByte of Buffer.from(genesisBlock.generatorPublicKey, "hex")) {
	// 		byteBuffer.writeByte(generatorByte);
	// 	}

	// 	// Unreachable
	// 	// if (genesisBlock.blockSignature) {
	// 	//     for (const blockSignatureByte of Buffer.from(genesisBlock.blockSignature, "hex")) {
	// 	//         byteBuffer.writeByte(blockSignatureByte);
	// 	//     }
	// 	// }

	// 	byteBuffer.flip();

	// 	return byteBuffer.toBuffer();
	// }

	// private writeGenesisBlock(genesisBlock: Types.JsonObject): void {
	// 	const filePath: string = resolve(this.destination, "genesisBlock.json");

	// 	if (this.options.crypto.genesisBlock) {
	// 		writeJSONSync(filePath, this.options.crypto.genesisBlock, { spaces: 4 });
	// 	} else {
	// 		writeJSONSync(filePath, genesisBlock, { spaces: 4 });
	// 	}
	// }

	// private writeMilestones(genesisBlock: Types.JsonObject): void {
	// 	const filePath: string = resolve(this.destination, "milestones.json");

	// 	if (this.options.crypto.milestones) {
	// 		writeJSONSync(filePath, this.options.crypto.milestones, { spaces: 4 });
	// 	} else {
	// 		writeJSONSync(
	// 			resolve(this.destination, "milestones.json"),
	// 			this.generateMilestones(
	// 				this.options.crypto.flags.validators,
	// 				this.options.crypto.flags.blockTime,
	// 				this.options.crypto.flags.maxTxPerBlock,
	// 				this.options.crypto.flags.maxBlockPayload,
	// 				this.options.crypto.flags.rewardHeight,
	// 				this.options.crypto.flags.rewardAmount,
	// 			),
	// 			{ spaces: 4 },
	// 		);
	// 	}
	// }

	// private writeNetwork(payloadHash: string): void {
	// 	const filePath: string = resolve(this.destination, "network.json");

	// 	if (this.options.crypto.network) {
	// 		writeJSONSync(filePath, this.options.crypto.network, { spaces: 4 });
	// 	} else {
	// 		writeJSONSync(
	// 			filePath,
	// 			this.generateNetwork(
	// 				this.options.crypto.flags.network,
	// 				this.options.crypto.flags.pubKeyHash,
	// 				payloadHash,
	// 				this.options.crypto.flags.wif,
	// 				this.options.crypto.flags.token,
	// 				this.options.crypto.flags.symbol,
	// 				this.options.crypto.flags.explorer,
	// 			),
	// 			{ spaces: 4 },
	// 		);
	// 	}
	// }
}
