import { IBlock, IBlockData } from "../crypto";
import { Queue } from "../kernel/queue";

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

	handleIncomingBlock(block: IBlockData, fromForger): Promise<void>;

	enqueueBlocks(blocks: IBlockData[]);

	resetLastDownloadedBlock(): void;

	forceWakeup(): void;

	isSynced(block?: IBlockData): boolean;

	getLastBlock(): IBlock;

	getLastHeight(): number;

	getLastDownloadedBlock(): IBlockData;
}
