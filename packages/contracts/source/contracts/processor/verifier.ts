import { ProcessableUnit } from "./processable-unit.js";

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<void>;
}
