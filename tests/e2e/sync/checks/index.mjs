import express from "express";

import { config } from "./config.mjs";
import { getApiHttp } from "./client.mjs";

const app = express();
app.use(express.json());

const MINIMUM_BLOCKS_TO_SYNC = Number(process.env.MINIMUM_BLOCKS_TO_SYNC);

(async () => {
	await waitForSync();

	console.log(`checks successful. exiting`);
})();

async function waitForSync() {
	for (;;) {
		try {
			const { genesisBlock } = await getApiHttp(config.peer, "/node/configuration/crypto");
			const { blockNumber } = await getApiHttp(config.peer, "/node/syncing");

			const syncedBlocks = blockNumber - genesisBlock.block.number;
			const remainingBlocks = MINIMUM_BLOCKS_TO_SYNC - syncedBlocks;

			console.log({ genesisBlockNumber: genesisBlock.block.number, currentBlockNumber: blockNumber, syncedBlocks, remainingBlocks });

			if (remainingBlocks <= 0) {
				break;
			}

		} catch { }

		await sleep(1000);
	};
}

const sleep = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));
