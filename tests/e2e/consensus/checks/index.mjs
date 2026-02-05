import got from "got";
import express from "express";
import { sleep } from "/mainsail/packages/utils/distribution/index.js";

import { getApiHttp } from "./client.mjs";
import { config } from "./config.mjs";
import { eventEmitter } from "./events.mjs";
import { broadcastedTransactions, broadcastTransactions, tokenContractValidations } from "./transactions.mjs";

const app = express();
app.use(express.json());

// Listen for blocks until reaching TARGET_BLOCK_NUMBER
const TARGET_BLOCK_NUMBER = 15; // ~ 4 minutes
const EXPECTED_NUMBER_OF_PEERS = 6;

let webhookTarget;
let peers = [];

// Results
let allPeersReachedTargetBlockNumber = false;
let allTransactionsReportedByApi = false;
let allTransactionsSuccessful = false;
let allTokenChecksSuccessful = false;

const peerBlockNumberMap = new Map();

(async () => {
	await discoverPeers();
	await setupWebhook();
	app.listen(3001, function () {
		console.log("Block listener port 3001!");
	});

	await broadcastTransactions();

	await waitForResults();
})();

async function waitForResults() {
	do {
		await sleep(1000);
		console.log("waiting for results...", { allPeersReachedTargetBlockNumber, allTransactionsReportedByApi, allTokenChecksSuccessful, allTransactionsSuccessful });

		if (!allTransactionsReportedByApi) {
			try {
				let transactionsFound = true;
				let receiptsSuccessful = true;
				for (const hash of broadcastedTransactions) {
					const response = await getApiHttp(config.peer, `/transactions/${hash}`);
					if (!response) {
						transactionsFound = false;
						break;
					}

					const { data: transaction } = response;
					if (!transaction) {
						transactionsFound = false;
						break;
					}

					if (transaction.receipt.status !== 1) {
						console.log("transaction failed!!", transaction);
						receiptsSuccessful = false;
					}
				}

				if (transactionsFound) {
					allTransactionsReportedByApi = true;
				}

				if (receiptsSuccessful) {
					allTransactionsSuccessful = true;
				}

			} catch (ex) {
				console.log(ex);
			}
		}

		if (!allTokenChecksSuccessful) {
			try {
				let tokensOk = true;
				for (const validation of tokenContractValidations) {
					const { results: holders } = await getApiHttp(config.peer, `/tokens/${validation.address}/holders`);
					const hasTokenHolder = holders.some(h => h.address === config.tokenBeneficiary && h.balance === validation.tokenBeneficiaryBalance);
					if (!hasTokenHolder) {
						tokensOk = false;
					} else {
						console.log(`OK: ${JSON.stringify(validation)}`)
					}
				}

				if (tokensOk) {
					allTokenChecksSuccessful = true;
				}
			} catch (ex) {
				console.log(ex);
			}
		}

	} while (!allPeersReachedTargetBlockNumber || !allTransactionsSuccessful || !allTransactionsReportedByApi || !allTokenChecksSuccessful);

	console.log(`checks successful. exiting`);

	process.exit(0);
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

		const blockData = req.body.data;

		if (!peerBlockNumberMap.has(req.ip)) {
			console.log("ignoring peer callback", req.ip);
			return;
		}

		console.log(`got block ${blockData.number} from ${req.ip}`);
		const seen = [...peerBlockNumberMap.values()].some(b => b === blockData.number);
		if (!seen) {
			console.log("emitting block.applied", { number: blockData.number });
			eventEmitter.emit("block.applied", blockData);
		}

		peerBlockNumberMap.set(req.ip, blockData.number);

		if (blockData.number >= TARGET_BLOCK_NUMBER && peerBlockNumberMap.has(req.ip)) {
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
		for (; ;) {
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
