import { Contracts, Identifiers } from "@mainsail/contracts";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa";
import { describe, Factories, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/core/crypto.json";
import { secrets } from "../config/core/validators.json";
import { LocalClient } from "./clients/index.js";
import { Client } from "./types";

const URL = "http://127.0.0.1:4008/api";

describe<{
	sandbox: Sandbox;
	localClient: LocalClient;
	clients: Client[];
	privateKey: string;
}>("General", ({ beforeEach, it, assert, nock }) => {
	beforeEach(async (context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);
		context.clients = [];
		// context.clients = [new EthersClient(URL), new ViemClient(URL)];
		// context.clients = [new EthersClient(URL)];

		const sandbox = new Sandbox();
		// const sandbox = new Sandbox().withConfigurationOptions({
		// 	chainId: crypto.network.chainId,
		// 	network: crypto.network.name,
		// 	symbol: crypto.network.client.symbol,
		// 	token: crypto.network.client.token,
		// });
		context.sandbox = sandbox;
		sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		const keyPairFactory = sandbox.app.resolve(KeyPairFactory);
		const keyPair = await keyPairFactory.fromMnemonic("");
		context.privateKey = `0x${keyPair.privateKey}`;
	});

	it("Contract - call", async ({ localClient, clients }) => {
		// const address = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1"; // Consensus contract PROXY
		// const data = encodeFunctionData({
		// 	abi: ConsensusAbi.abi,
		// 	functionName: "activeValidatorsCount",
		// });
		// const result = await localClient.call(address, data);
		// assert.equal(Number(result), 5);
		// for (const client of clients) {
		// 	const r = await client.call(address, data);
		// 	assert.equal(result, r);
		// }
		const factoryBuilder = new Factories.FactoryBuilder();
		await Factories.Factories.registerTransactionFactory(factoryBuilder, crypto);
		const transaction: Contracts.Crypto.Transaction = await (
			await factoryBuilder
				.get("Transfer")
				.withOptions({
					nonce: 1,
					passphrase: secrets[0],
				})
				.withStates("sign")
				.make()
		).build();

		const serialized = console.log(transaction.serialized.toString("hex"));

		console.log(serialized);
	});
});
