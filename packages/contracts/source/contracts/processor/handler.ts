import { ProcessableUnit } from "./processable-unit.js";

export interface Handler {
	execute(unit: ProcessableUnit): Promise<void>;
}
