import { BlockProcessorResult } from "./block-processor-result.js";
import { ProcessableUnit } from "./processable-unit.js";

export interface BlockProcessor {
	process(unit: ProcessableUnit): Promise<BlockProcessorResult>;
	commit(unit: ProcessableUnit): Promise<void>;
}
