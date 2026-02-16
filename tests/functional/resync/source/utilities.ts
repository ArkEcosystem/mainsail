import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { sleep } from "@mainsail/utils";

export const waitBlock = async (app: Contracts.Kernel.Application, count: number = 1) => {
    const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
    const query = app.get<Contracts.TransactionPool.Query>(Identifiers.TransactionPool.Query);

    let remainingTransactions = await query.getAll().all();

    let currentBlockNumber = store.getBlockNumber();
    let targetBlockNumber = currentBlockNumber + count;

    do {
        await sleep(100);
        currentBlockNumber = store.getBlockNumber();
        remainingTransactions = await query.getAll().all();

        if (remainingTransactions.length > 0) {
            targetBlockNumber = Math.max(currentBlockNumber, targetBlockNumber) + 1;
        }
    } while (currentBlockNumber < targetBlockNumber);
};
