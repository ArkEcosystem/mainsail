import nm from "nanomatch";

// @TODO review the implementation
export const isWhitelisted = (whitelist: string[], remoteAddress: string): boolean => {
	if (!Array.isArray(whitelist) || whitelist.length === 0) {
		return true;
	}

	for (const ip of whitelist) {
		try {
			if (nm.isMatch(remoteAddress, ip)) {
				return true;
			}
		} catch {}
	}

	return false;
};
