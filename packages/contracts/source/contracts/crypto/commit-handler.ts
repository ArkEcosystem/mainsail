import type { ProcessableUnit } from "../processor/processable-unit.js";

export interface CommitHandler {
	onCommit(unit: ProcessableUnit): Promise<void>;
}
