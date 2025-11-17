export enum Step {
	Propose = 0,
	Prevote = 1,
	Precommit = 2,
}

export enum ProcessorResult {
	Invalid = 0,
	Accepted = 1,
	Skipped = 2,
}
