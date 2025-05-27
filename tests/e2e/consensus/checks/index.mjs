import got from "got";
import express from "express";

import { ConsensusAbi } from "/mainsail/packages/evm-contracts/distribution/index.js";
import { makeEvmCall, makeEvmDeploy } from "./tx.mjs";
import { getApiHttp, postTransactions } from "./client.mjs";
import { config } from "./config.mjs";

const app = express();
app.use(express.json());

// Listen for blocks until reaching TARGET_BLOCK_NUMBER
const TARGET_BLOCK_NUMBER = 15; // ~ 4 minutes
const EXPECTED_NUMBER_OF_PEERS = 6;

let webhookTarget;
let peers = [];

let broadcastedTransactions = [];

// Results
let allPeersReachedTargetBlockNumber = false;
let allTransactionsReportedByApi = false;
let allTransactionsSuccessful = false;

const peerBlockNumberMap = new Map();

(async () => {
	await discoverPeers();
	await setupWebhook();
	await broadcastTransactions();
	
	app.listen(3001, function () {
		console.log("Block listener port 3001!");
	});

	await waitForResults();
})();

async function waitForResults() {
	do {
		await sleep(1000);
		console.log("waiting for results...", { allPeersReachedTargetBlockNumber, allTransactionsReportedByApi, allTransactionsSuccessful });

		if (!allTransactionsReportedByApi) {
			try { 
			   let allFound = true;
			   let allSuccessful = true;
			   for (const hash of broadcastedTransactions) {
				   const transaction = await getApiHttp(config.peer, `/transactions/${hash}`);
				   if (!transaction) {
						allFound = false;
						break;
				   }

				   if (transaction.receipt.status !== 1) {
						console.log("transaction failed!!", transaction);
						allSuccessful = false;
				   }
			   }
   
			   if (allFound) {
				   allTransactionsReportedByApi = true;
			   }

			   if (allSuccessful) {
				   allTransactionsSuccessful = true;
			   }
		   } catch (ex) {
				console.log(ex);
		   }
		}

	} while (!allPeersReachedTargetBlockNumber || !allTransactionsReportedByApi);

	console.log(`checks successful. exiting`);

	process.exit(allTransactionsSuccessful ? 0 : 1);
}

async function broadcastTransactions() {
	const tx = await makeEvmCall(`${config.to}`, "100000000");
	const txDeploy = await makeEvmDeploy(ConsensusAbi, 1);
	const response = await postTransactions(config.peer, [
		tx.serialized.toString("hex"),
		txDeploy.serialized.toString("hex"),
	]);

	console.log("broadcastTransactions", { txs: [tx.hash, txDeploy.hash], response: JSON.stringify(response) });
	broadcastedTransactions.push(tx.hash, txDeploy.hash);
}

async function discoverPeers() {
	do {
		const resp = await got("http://peerdiscovery:3000", {
			headers: {
				"x-mainsail-e2e-no-peer": "1",
			},
		});

		// 'myIp' is the target url for the webhook
		const myIp = resp.headers["x-mainsail-e2e-my-ip"].replace("::ffff:", "");

		webhookTarget = `http://${myIp}:3001/callback`;
		console.log("resp body", resp.statusCode, resp.body);
		peers = JSON.parse(resp.body) ?? [];

		console.log({ webhookTarget, peers });

		await sleep(1000);
	} while (peers.length < EXPECTED_NUMBER_OF_PEERS);

	for (const peer of peers) {
		peerBlockNumberMap.set(peer.ip, 0);
	}
}

async function setupWebhook() {
	app.post("/callback", function (req, res) {
		res.status(200).end();

		const { number } = req.body.data;

		if (!peerBlockNumberMap.has(req.ip)) {
			console.log("ignoring peer callback", req.ip);
			return;
		}

		console.log(`got block ${number} from ${req.ip}`);
		peerBlockNumberMap.set(req.ip, number);

		if (number >= TARGET_BLOCK_NUMBER && peerBlockNumberMap.has(req.ip)) {
			console.log(`received target ${TARGET_BLOCK_NUMBER} from ${req.ip}`);
			peerBlockNumberMap.delete(req.ip);

			if (peerBlockNumberMap.size === 0) {
				console.log(`successfully reached target block number on all peers.`);
				allPeersReachedTargetBlockNumber = true;
			}
		}
	});

	// register webhook on all peers
	for (const peer of peers) {
		for (;;) {
			peer.ip = peer.ip.replace("::ffff:", "");
			const peerWebhookEndpoint = `http://${peer.ip}:4004/api/webhooks`;

			const resp = await got.post(peerWebhookEndpoint, {
				json: {
					conditions: [],
					event: "block.applied",
					enabled: true,
					target: webhookTarget,
				},
			});

			await sleep(1000);

			if (resp.statusCode === 201) {
				console.log(`registered webhook at ${peerWebhookEndpoint}`);
				break;
			}
		}
	}
}

const sleep = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));
