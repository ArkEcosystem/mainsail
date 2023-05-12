import { Machine } from "xstate";

export const blockchainMachine: any = Machine({
	initial: "uninitialised",
	key: "blockchain",
	states: {
		exit: {
			onEntry: ["exitApp"],
		},
		idle: {
			on: {
				NEWBLOCK: "newBlock",
				STOP: "stopped",
				WAKEUP: "syncWithNetwork",
			},
			onEntry: ["checkLater", "blockchainReady"],
		},
		init: {
			on: {
				FAILURE: "exit",
				NETWORKSTART: "idle",
				STARTED: "syncWithNetwork",
				STOP: "stopped",
			},
			onEntry: ["init"],
		},
		newBlock: {
			on: {
				PROCESSFINISHED: "idle",
				STOP: "stopped",
			},
		},
		/**
		 * This state should be used for stopping the blockchain on surpose, not as
		 * a result of critical errors. In those cases, using the `exit` state would
		 * be a better option
		 */
		stopped: {
			onEntry: ["stopped"],
		},

		syncWithNetwork: {
			initial: "syncing",
			on: {
				STOP: "stopped",
				SYNCFINISHED: "idle",
				TEST: "idle",
			},
			states: {
				downloadBlocks: {
					on: {
						DOWNLOADED: "syncing",
						NOBLOCK: "syncing",
						PROCESSFINISHED: "downloadFinished",
					},
					onEntry: ["downloadBlocks"],
				},
				downloadFinished: {
					on: {
						PROCESSFINISHED: "processFinished",
					},
					onEntry: ["downloadFinished"],
				},
				downloadPaused: {
					on: {
						PROCESSFINISHED: "processFinished",
					},
					onEntry: ["downloadPaused"],
				},
				end: {
					onEntry: ["syncingComplete"],
				},
				idle: {
					on: {
						DOWNLOADED: "downloadBlocks",
					},
				},
				processFinished: {
					on: {
						NOTSYNCED: "downloadBlocks",
						SYNCED: "end",
					},
					onEntry: ["checkLastBlockSynced"],
				},
				syncing: {
					on: {
						NETWORKHALTED: "end",
						NOTSYNCED: "downloadBlocks",
						PAUSED: "downloadPaused",
						SYNCED: "downloadFinished",
					},
					onEntry: ["checkLastDownloadedBlockSynced"],
				},
			},
		},

		uninitialised: {
			on: {
				START: "init",
				STOP: "stopped",
			},
		},
	},
});
