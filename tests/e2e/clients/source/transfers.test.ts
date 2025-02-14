import { Contracts, Identifiers } from "@mainsail/contracts";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa";
import { describe, Factories, Sandbox } from "@mainsail/test-framework";
import { ethers } from "ethers";

import crypto from "../config/core/crypto.json";
import { secrets } from "../config/core/validators.json";
import { EthersClient, LocalClient, ViemClient } from "./clients/index.js";
import { Client } from "./types";

const URL = "http://127.0.0.1:4008/api";
const TX_INCLUDE_DELAY = 5000;

describe<{
	sandbox: Sandbox;
	localClient: LocalClient;
	clients: Client[];
	privateKey: string;
	address: string;
}>("General", ({ beforeEach, it, assert, nock }) => {
	beforeEach(async (context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);
		context.clients = [context.localClient];
		context.clients = [context.localClient, new EthersClient(URL), new ViemClient(URL)];

		const sandbox = new Sandbox();
		context.sandbox = sandbox;
		sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		const keyPairFactory = sandbox.app.resolve(KeyPairFactory);
		const keyPair = await keyPairFactory.fromMnemonic(secrets[0]);
		context.privateKey = `0x${keyPair.privateKey}`;
		context.address = ethers.computeAddress(`0x${keyPair.publicKey}`);
	});

	it("Transactions - transfer should be accepted", async ({ localClient, clients, address }) => {
		const factoryBuilder = new Factories.FactoryBuilder();
		await Factories.Factories.registerTransactionFactory(factoryBuilder, crypto);
		let nonce = await localClient.getNonce(address);

		const ids: string[] = [];

		for (const client of clients) {
			const transaction: Contracts.Crypto.Transaction = await (
				await factoryBuilder
					.get("Transfer")
					.withOptions({
						nonce: nonce++,
						passphrase: secrets[0],
					})
					.withStates("sign")
					.make()
			).build();

			const serialized = `0x${transaction.serialized.toString("hex")}`;

			const result = await client.sendTx(serialized);
			ids.push(result);

			assert.equal(`0x${transaction.id}`, result);
		}

		await new Promise((resolve) => {
			setTimeout(resolve, TX_INCLUDE_DELAY);
		});

		for (const id of ids) {
			const receipt = await localClient.getReceipt(id);
			assert.equal(receipt.status, "0x1");
		}
	});
});
