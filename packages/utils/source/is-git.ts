export const isGit = (value: string): boolean =>
	new RegExp(/(?:git|ssh|https?|git@[\w.-]+):(\/\/)?(.*?)(\.git)(\/?|#[\w.-]+?)$/).test(value);
