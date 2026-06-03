// Normalizes an unknown thrown value into an Error. `throw` accepts any value in
// JavaScript, so a caught value is never guaranteed to be an Error. This narrows
// it safely and never throws itself.
export const ensureError = (value: unknown): Error => {
	if (value instanceof Error) {
		return value;
	}

	if (typeof value === "string") {
		return new Error(value);
	}

	try {
		// JSON.stringify returns undefined for symbols/functions/undefined, so fall
		// back to String() for those. It also throws on bigint/circular references,
		// which the catch handles.
		return new Error(JSON.stringify(value) ?? String(value));
	} catch {
		return new Error(String(value));
	}
};
