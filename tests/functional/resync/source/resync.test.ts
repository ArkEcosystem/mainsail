import type { Contracts } from "@mainsail/contracts";
import { describe } from "@mainsail/test-runner";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { setupSyncNode } from "./setup.js";
import { verifyNodeIntegrity } from "./integrity.js";
import { forgeTransactions, getRandomConsensusKeyPair, getWallets, waitBlock } from "./utilities.js"
import { dirSync } from "tmp";
import { getCreateAddress, Hex, parseEther } from "viem";

describe<{
    syncNode: Contracts.Kernel.Application;
    dataDirectory: string;
}>("Resync", ({ beforeEach, afterEach, it, assert }) => {
    beforeEach(async (context) => {
        const dataDirectory = dirSync({ unsafeCleanup: true }).name

        context.dataDirectory = dataDirectory;
        context.syncNode = await setupSyncNode(dataDirectory);
    });

    afterEach(async ({ syncNode, dataDirectory }) => {
        await verifyNodeIntegrity(assert, syncNode, dataDirectory);
    });

    it("should be ok", async ({ syncNode }) => {
        await waitBlock(syncNode, 5);
    });

    it("should be ok with votes", async ({ syncNode }) => {
        const wallets = await getWallets(syncNode);

        const context = { app: syncNode, wallets };
        const randomWallet = await Utils.getRandomColdWallet(context);

        const fundTx = await EvmCalls.makeEvmCall(context, {
            recipient: randomWallet.address,
            value: parseEther("300"),
        });
        assert.true(await forgeTransactions(context, [fundTx]));

        const voteTx = await EvmCalls.makeValidatorVote(context, {
            sender: randomWallet.keyPair,
            vote: await Utils.getAddressByPublicKey(context, wallets[0].publicKey),
        });

        assert.true(await forgeTransactions(context, [voteTx]));

        const unvoteTx = await EvmCalls.makeValidatorUnvote(context, {
            sender: randomWallet.keyPair,
        });

        assert.true(await forgeTransactions(context, [unvoteTx]));
    });
});