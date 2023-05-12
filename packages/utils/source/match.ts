export const match = <T>(expected: string, cases: Record<string, CallableFunction>): T => {
	for (const [actual, callback] of Object.entries(cases)) {
		if (expected === actual) {
			return callback();
		}
	}

	throw new Error(`No matches for ${expected.toString()}`);
};
