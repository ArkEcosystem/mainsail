import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { EvmCallBuilder, ServiceProvider as CoreCryptoTransactionEvmCall } from "@mainsail/crypto-transaction-evm-call";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { BigNumber } from "packages/utils/distribution/big-number.js";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { Sandbox } from "../../../test-framework/source";
import { Deserializer } from "../../source/deserializer";
import { BlockFactory } from "../../source/factory";
import { IDFactory } from "../../source/id.factory";
import { Serializer } from "../../source/serializer";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.bind(Identifiers.Cryptography.Block.HeaderSize).toFunction(() => {
		const hashByteLength = context.sandbox.app.get<number>(Identifiers.Cryptography.Hash.Size.SHA256);
		const generatorAddressByteLength = context.sandbox.app.get<number>(
			Identifiers.Cryptography.Identity.Address.Size,
		);

		return (
			1 + // version
			6 + // timestamp
			4 + // height
			4 + // round
			hashByteLength + // previousBlock
			hashByteLength + // stateHash
			2 + // numberOfTransactions
			4 + // totalGasUsed
			32 + // totalAmount
			32 + // totalFee
			32 + // reward
			4 + // payloadLength
			hashByteLength + // payloadHash
			generatorAddressByteLength
		);
	});

	context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => {} });
	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoConsensus).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoTransactionEvmCall).register();
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory);

	const builder = context.sandbox.app.resolve(EvmCallBuilder);

	await builder
		.network(30)
		.gasLimit("1000000")
		.gasPrice("10")
		.value("100")
		.nonce(0)
		.recipientAddress("0xbe89811e15f611c1db12e59679b6f3dc1f430155");

	await builder.sign(
		"gauge find shift stable position fog guard urge person hint frown disagree stem scout suggest focus actress side rhythm crush soccer accuse soccer arctic",
	);

	const tx1 = await builder.build();

	const builder2 = context.sandbox.app.resolve(EvmCallBuilder);

	await builder2
		.network(30)
		.gasLimit("1000000")
		.gasPrice("10")
		.value("200")
		.nonce(1)
		.recipientAddress("0xbe89811e15f611c1db12e59679b6f3dc1f430155");

	await builder2.sign(
		"gauge find shift stable position fog guard urge person hint frown disagree stem scout suggest focus actress side rhythm crush soccer accuse soccer arctic",
	);
	const tx2 = await builder2.build();

	// console.log(tx1, tx2);

	const blockFactory = context.sandbox.app.get(Identifiers.Cryptography.Block.Factory);

	const transactions = [tx1, tx2];

	let payloadLength = transactions.length * 2;
	// const payloadBuffers: Buffer[] = [];

	for (const transaction of transactions) {
		payloadLength += transaction.serialized.length;
	}

	// payloadBuffers.push(Buffer.from(tx1.id, "hex"));
	// payloadBuffers.push(Buffer.from(tx2.id, "hex"));

	const block = await blockFactory.make(
		{
			generatorAddress: "0xd1AD6bfA3540F25E21e6be808FB7F12562111CE5",
			height: 1,
			numberOfTransactions: 2,
			payloadHash: "0d053ecf6de04d76e15fd431a417d0585e04bb421ca8d4d95b232442ef4ddbd2",
			payloadLength: payloadLength,
			previousBlock: "0d053ecf6de04d76e15fd431a417d0585e04bb421ca8d4d95b232442ef4ddbd2",
			reward: BigNumber.ZERO,
			round: 0,
			stateHash: "0d053ecf6de04d76e15fd431a417d0585e04bb421ca8d4d95b232442ef4ddbd2",
			timestamp: 1_000_000,
			totalAmount: BigNumber.make("300"),
			totalFee: BigNumber.make("20"),
			totalGasUsed: 2_000_000,
			transactions: transactions.map((transaction) => transaction.data),
			version: 1,
		},
		transactions,
	);

	// console.log(JSON.stringify(block, undefined, 2));
	// console.log(block.serialized.toString("hex"));
};
