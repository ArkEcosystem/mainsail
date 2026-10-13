import mm from "micromatch";

export const isWhitelisted = (whitelist: string[], remoteAddress: string): boolean => {
	if (!Array.isArray(whitelist) || whitelist.length === 0) {
		return true;
	}

	for (const ip of whitelist) {
		try {
			if (mm.isMatch(remoteAddress, ip)) {
				return true;
			}
		} catch {}
	}

	return false;
};
