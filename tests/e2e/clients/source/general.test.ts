import { Identifiers } from "@mainsail/contracts";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { encodeFunctionData } from "viem";

import { genesisBlock, network } from "../config/core/crypto.json";
import { EthersClient, LocalClient, ViemClient } from "./clients/index.js";
import { Client } from "./types";
import { compareBlocks, compareReceipts, compareTransactions } from "./utils/index.js";

const URL = "http://127.0.0.1:4008/api";

describe<{
	localClient: LocalClient;
	clients: Client[];
	privateKey: string;
}>("General", ({ beforeEach, it, assert, nock }) => {
	beforeEach(async (context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);
		context.clients = [new EthersClient(URL), new ViemClient(URL)];

		const sandbox = new Sandbox();
		sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		const keyPairFactory = sandbox.app.resolve(KeyPairFactory);
		const keyPair = await keyPairFactory.fromMnemonic("");
		context.privateKey = `0x${keyPair.privateKey}`;
	});

	it("Network - should get chainId", async ({ localClient, clients }) => {
		const chainId = await localClient.getChainId();
		assert.equal(chainId, network.chainId);

		for (const client of clients) {
			const c = await client.getChainId();
			assert.equal(chainId, c);
		}
	});

	it("Block - should return current block height", async ({ localClient, clients }) => {
		const height = await localClient.getHeight();
		assert.number(height);

		for (const client of clients) {
			assert.equal(height, await client.getHeight());
		}
	});

	it("Block - should get latest block", async ({ localClient, clients }) => {
		const lastBlock = await localClient.getBlock("latest");

		for (const client of clients) {
			const b = await client.getBlock("latest");
			compareBlocks(assert, lastBlock, b);
		}
	});

	it("Block - should get genesis block", async ({ localClient, clients }) => {
		const lastBlock = await localClient.getBlock(0);

		for (const client of clients) {
			const b = await client.getBlock(0);
			compareBlocks(assert, lastBlock, b);
		}
	});

	it("Transaction - should get genesis transaction by hash", async ({ localClient, clients }) => {
		const hash = `0x${genesisBlock.block.transactions[0].hash}`;
		const tx = await localClient.getTransaction(hash);

		for (const client of clients) {
			const t = await client.getTransaction(hash);
			compareTransactions(assert, tx, t);
		}
	});

	it("Transaction - should get genesis transaction by index", async ({ localClient, clients }) => {
		const tx = await localClient.getTransactionByBlockNumberAndIndex(0, 0);

		for (const client of clients.filter((client) => client.name !== "ethers")) {
			const t = await client.getTransactionByBlockNumberAndIndex(0, 0);
			compareTransactions(assert, tx, t);
		}
	});

	it("Transaction - should get genesis receipt by hash", async ({ localClient, clients }) => {
		const hash = `0x${genesisBlock.block.transactions[0].hash}`;
		const receipt = await localClient.getReceipt(hash);

		for (const client of clients) {
			const r = await client.getReceipt(hash);
			compareReceipts(assert, receipt, r);
		}
	});

	it("Account - should get wallet balance", async ({ localClient, clients }) => {
		const address = genesisBlock.block.transactions[0].to;
		const balance = await localClient.getBalance(address);

		assert.not.equal(balance, 0);

		for (const client of clients) {
			const b = await client.getBalance(address);
			assert.equal(balance, b);
		}
	});

	it("Account - should get wallet nonce", async ({ localClient, clients }) => {
		const address = genesisBlock.block.transactions[0].from;
		const nonce = await localClient.getNonce(address);

		assert.not.equal(nonce, 0);

		for (const client of clients) {
			const n = await client.getNonce(address);
			assert.equal(nonce, n);
		}
	});

	it("Contract - should get code", async ({ localClient, clients }) => {
		const address = "0x522B3294E6d06aA25Ad0f1B8891242E335D3B459"; // Consensus contract
		const code = await localClient.getCode(address);

		assert.not.equal(code, "0x");

		for (const client of clients) {
			const c = await client.getCode(address);
			assert.equal(code, c);
		}
	});

	it("Contract - get storage", async ({ localClient, clients }) => {
		const address = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1"; // Consensus contract PROXY
		const position = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"; //Slot for original address
		const storage = await localClient.getStorageAt(address, position);

		assert.equal(storage, "0x000000000000000000000000522b3294e6d06aa25ad0f1b8891242e335d3b459");

		for (const client of clients) {
			const s = await client.getStorageAt(address, position);
			assert.equal(storage, s);
		}
	});

	it("Contract - call", async ({ localClient, clients }) => {
		const address = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1"; // Consensus contract PROXY
		const data = encodeFunctionData({
			abi: ConsensusAbi.abi,
			functionName: "activeValidatorsCount",
		});

		const result = await localClient.call(address, data);

		assert.equal(Number(result), 5);

		for (const client of clients) {
			const r = await client.call(address, data);
			assert.equal(result, r);
		}
	});
});
