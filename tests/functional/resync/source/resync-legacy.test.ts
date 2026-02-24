import type { Contracts } from "@mainsail/contracts";
import { describe } from "@mainsail/test-runner";
import { setupLegacySyncNode } from "./setup.js";
import { verifyLegacyNodeIntegrity } from "./integrity.js";
import { waitBlock } from "./utilities.js"
import { dirSync } from "tmp";

describe<{
    syncNode: Contracts.Kernel.Application;
    dataDirectory: string;
}>("Resync Legacy", ({ beforeEach, afterEach, it, assert }) => {
    beforeEach(async (context) => {
        const dataDirectory = dirSync({ unsafeCleanup: true }).name

        context.dataDirectory = dataDirectory;
        context.syncNode = await setupLegacySyncNode(dataDirectory);
    });

    afterEach(async ({ syncNode, dataDirectory }) => {
        await verifyLegacyNodeIntegrity(assert, syncNode, dataDirectory);
    });

    it("should be ok", async ({ syncNode }) => {
        await waitBlock(syncNode, 5);
    });

});