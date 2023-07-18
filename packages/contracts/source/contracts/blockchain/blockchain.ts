import { IBlock, IBlockData } from "../crypto";

export interface Blockchain {
	isStopped(): boolean;

	dispatch(event): void;

	boot(skipStartedCheck?: boolean): Promise<boolean>;

	isBooted(): boolean;

	dispose(): Promise<void>;

	setWakeUp(): void;

	resetWakeUp(): void;

	resetLastDownloadedBlock(): void;

	forceWakeup(): void;

	isSynced(block?: IBlockData): boolean;

	getLastBlock(): IBlock;

	getLastHeight(): number;

	getLastDownloadedBlock(): IBlockData;
}
