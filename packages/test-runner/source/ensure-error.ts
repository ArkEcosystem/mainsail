// Local copy of @mainsail/utils' ensureError. test-runner cannot depend on
// @mainsail/utils because utils dev-depends on test-runner (dependency cycle).
export const ensureError = (value: unknown): Error => {
	if (value instanceof Error) {
		return value;
	}

	if (typeof value === "string") {
		return new Error(value);
	}

	try {
		return new Error(JSON.stringify(value) ?? String(value));
	} catch {
		return new Error(String(value));
	}
};
