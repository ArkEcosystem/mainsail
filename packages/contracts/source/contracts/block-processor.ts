import { IRoundState } from "./consensus";

export interface Handler {
	execute(roundState: IRoundState): Promise<boolean>;
}

export interface Processor {
	process(roundState: IRoundState): Promise<boolean>;
}
