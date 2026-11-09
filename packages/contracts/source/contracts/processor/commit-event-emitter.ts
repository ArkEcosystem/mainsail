import type { ProcessableUnit } from "./processable-unit.js";

export interface CommitEventEmitter {
	emit(unit: ProcessableUnit): void;
}
