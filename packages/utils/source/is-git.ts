export const isGit = (value: string): boolean =>
	/(?:git|ssh|https?|git@[\w.-]+):(\/\/)?(.*?)(\.git)(\/?|#[\w.-]+?)$/.test(value);
