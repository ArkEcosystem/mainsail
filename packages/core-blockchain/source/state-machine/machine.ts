import { Machine } from "xstate";

export const blockchainMachine: any = Machine({
	initial: "uninitialised",
	key: "blockchain",
	states: {
		exit: {
			onEntry: ["exitApp"],
		},
		fork: {
			on: {
				FAILURE: "exit",
				STOP: "stopped",
				SUCCESS: "syncWithNetwork",
			},
			onEntry: ["startForkRecovery"],
		},
		idle: {
			on: {
				FORK: "fork",
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
				ROLLBACK: "rollback",
				STARTED: "syncWithNetwork",
				STOP: "stopped",
			},
			onEntry: ["init"],
		},
		newBlock: {
			on: {
				FORK: "fork",
				PROCESSFINISHED: "idle",
				STOP: "stopped",
			},
		},
		rollback: {
			on: {
				FAILURE: "exit",
				STOP: "stopped",
				SUCCESS: "init",
			},
			onEntry: ["rollbackDatabase"],
		},
		/**
		 * This state should be used for stopping the blockchain on purpose, not as
		 * a result of critical errors. In those cases, using the `exit` state would
		 * be a better option
		 */
		stopped: {
			onEntry: ["stopped"],
		},

		syncWithNetwork: {
			initial: "syncing",
			on: {
				SYNCFINISHED: "idle",
				FORK: "fork",
				TEST: "idle",
				STOP: "stopped",
			},
			states: {
				idle: {
					on: {
						DOWNLOADED: "downloadBlocks",
					},
				},
				downloadBlocks: {
					on: {
						DOWNLOADED: "syncing",
						NOBLOCK: "syncing",
						PROCESSFINISHED: "downloadFinished",
					},
					onEntry: ["downloadBlocks"],
				},
				syncing: {
					onEntry: ["checkLastDownloadedBlockSynced"],
					on: {
						SYNCED: "downloadFinished",
						NOTSYNCED: "downloadBlocks",
						PAUSED: "downloadPaused",
						NETWORKHALTED: "end",
					},
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
				processFinished: {
					on: {
						SYNCED: "end",
						NOTSYNCED: "downloadBlocks",
					},
					onEntry: ["checkLastBlockSynced"],
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
