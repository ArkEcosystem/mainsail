import { Interfaces } from "@arkecosystem/crypto";

import { Queue } from "../kernel/queue";
import { BlockPing } from "../state/state-store";

export interface Blockchain {
	isStopped(): boolean;

	getQueue(): Queue;

	dispatch(event): void;

	boot(skipStartedCheck?: boolean): Promise<boolean>;

	isBooted(): boolean;

	dispose(): Promise<void>;

	setWakeUp(): void;

	resetWakeUp(): void;

	clearAndStopQueue(): void;

	clearQueue(): void;

	handleIncomingBlock(block: Interfaces.IBlockData, fromForger): void;

	enqueueBlocks(blocks: Interfaces.IBlockData[]);

	removeBlocks(nblocks: number): Promise<void>;

	removeTopBlocks(count: number): Promise<void>;

	resetLastDownloadedBlock(): void;

	forceWakeup(): void;

	forkBlock(block: Interfaces.IBlock, numberOfBlockToRollback?: number): void;

	isSynced(block?: Interfaces.IBlockData): boolean;

	getLastBlock(): Interfaces.IBlock;

	getLastHeight(): number;

	getLastDownloadedBlock(): Interfaces.IBlockData;

	getBlockPing(): BlockPing | undefined;

	pingBlock(incomingBlock: Interfaces.IBlockData): boolean;

	pushPingBlock(block: Interfaces.IBlockData, fromForger): void;
}
