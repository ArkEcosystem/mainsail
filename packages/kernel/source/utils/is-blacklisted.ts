import nm from "nanomatch";

// @TODO review the implementation
export const isBlacklisted = (blacklist: string[], remoteAddress: string): boolean => {
	if (!Array.isArray(blacklist) || blacklist.length === 0) {
		return false;
	}

	for (const ip of blacklist) {
		try {
			if (nm.isMatch(remoteAddress, ip)) {
				return true;
			}
		} catch {}
	}

	return false;
};
