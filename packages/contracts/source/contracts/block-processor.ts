import { IBlock } from "./crypto";

export interface Handler {
	execute(block?: IBlock): Promise<boolean>;
}

export interface Processor {
	process(block: IBlock): Promise<boolean>;
}
