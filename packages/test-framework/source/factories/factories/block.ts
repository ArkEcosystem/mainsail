import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";
import { join } from "path";

import secrets from "../../internal/passphrases.json";
import { Signer } from "../../internal/signer";
import { FactoryBuilder } from "../factory-builder";
import { generateApp } from "./generate-app";

export const registerBlockFactory = async (
	factory: FactoryBuilder,
	config?: Contracts.Crypto.NetworkConfigPartial,
): Promise<void> => {
	const app = await generateApp(
		config ?? require(join(__dirname, "../../../../core/bin/config/testnet/mainsail/crypto.json")),
	);

	factory.set("Block", async ({ options }): Promise<Contracts.Crypto.ICommittedBlock> => {
		const previousBlock: Contracts.Crypto.IBlockData = options.getPreviousBlock
			? options.getPreviousBlock()
			: await app
					.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
					.get("genesisBlock.block");

		const { reward } = app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone(previousBlock.height);

		const transactions: Contracts.Crypto.ITransaction[] = options.transactions || [];
		if (options.transactionsCount) {
			const signer = new Signer(
				app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).all()!,
				options.nonce,
			);

			const genesisAddresses = (previousBlock.transactions ?? [])
				.map((transaction) => transaction.recipientId)
				.filter((address: string | undefined) => !!address);

			for (let index = 0; index < options.transactionsCount; index++) {
				transactions.push(
					await signer.makeTransfer({
						amount: ((options.amount || 2) + index).toString(),
						fee: (options.fee || 1).toString(),
						passphrase: secrets[0],
						recipientId: genesisAddresses[Math.floor(Math.random() * genesisAddresses.length)],
					}),
				);
			}
		}

		const totals: { amount: BigNumber; fee: BigNumber } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
		};
		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.ITransactionData[] = [];
		let payloadLength = transactions.length * 4;

		for (const { data, serialized } of transactions) {
			Utils.assert.defined<string>(data.id);

			totals.amount = totals.amount.plus(data.amount);
			totals.fee = totals.fee.plus(data.fee);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		const passphrase = options.passphrase || secrets[0];

		const blockCommit = {
			block: await app.get<Contracts.Crypto.IBlockFactory>(Identifiers.Cryptography.Block.Factory).make({
				generatorPublicKey: await app
					.getTagged<Contracts.Crypto.IPublicKeyFactory>(
						Identifiers.Cryptography.Identity.PublicKeyFactory,
						"type",
						"wallet",
					)
					.fromMnemonic(passphrase),
				height: previousBlock.height + 1,
				numberOfTransactions: transactions.length,
				payloadHash: (
					await app
						.get<Contracts.Crypto.IHashFactory>(Identifiers.Cryptography.HashFactory)
						.sha256(payloadBuffers)
				).toString("hex"),
				payloadLength,
				previousBlock: previousBlock.id,
				reward: options.reward || reward,
				timestamp: options.timestamp || dayjs().valueOf(),
				totalAmount: totals.amount,
				totalFee: totals.fee,
				transactions: transactionData,
				version: 1,
			}),
			// TODO: dont hardcode
			commit: {
				blockId: "365dbc2f380b65737b439f98ce9ef0318b00d5bbdda57daabea8341f91ce39e7",
				height: 1,
				round: 1,
				signature:
					"97a16d3e938a1bc6866701b946e703cfa502d57a226e540f270c16585405378e93086dfb3b32ab2039aa2c197177c66b0fec074df5bfac037efd3dc41d98d50455a69ff1934d503ef69dffa08429f75e5677efca4f2de36d46f8258635e32a95",
				validators: [
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
					true,
				],
			},
		};

		// const serializedCommit = "365dbc2f380b65737b439f98ce9ef0318b00d5bbdda57daabea8341f91ce39e7010000000100000097a16d3e938a1bc6866701b946e703cfa502d57a226e540f270c16585405378e93086dfb3b32ab2039aa2c197177c66b0fec074df5bfac037efd3dc41d98d50455a69ff1934d503ef69dffa08429f75e5677efca4f2de36d46f8258635e32a9533010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101";

		return {
			...blockCommit,
			serialized: (
				await app
					.get<Contracts.Crypto.IBlockSerializer>(Identifiers.Cryptography.Block.Serializer)
					.serializeFull(blockCommit)
			).toString("hex"),
		};
	});
};
