declare const StepValues: {
	readonly Propose: 0;
	readonly Prevote: 1;
	readonly Precommit: 2;
};
export type Step = (typeof StepValues)[keyof typeof StepValues];

declare const ProcessorResultValues: {
	readonly Invalid: 0;
	readonly Accepted: 1;
	readonly Skipped: 2;
};
export type ProcessorResult = (typeof ProcessorResultValues)[keyof typeof ProcessorResultValues];
