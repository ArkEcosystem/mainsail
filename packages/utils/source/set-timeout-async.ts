export const setTimeoutAsync = (callback: () => Promise<void>, delay: number): NodeJS.Timeout =>
	setTimeout(() => {
		void (async () => {
			await callback();
		})();
	}, delay);
