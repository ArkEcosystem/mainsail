export enum KernelEvent {
	Booted = "kernel.booted",
	Booting = "kernel.booting",
	Bootstrapped = "kernel.bootstrapper.bootstrapped",
	Bootstrapping = "kernel.bootstrapper.bootstrapping",
	ServiceProviderBooted = "kernel.serviceProvider.booted",
	ServiceProviderDisposed = "kernel.serviceProvider.disposed",
	ServiceProviderRegistered = "kernel.serviceProvider.registered",
}

export enum CacheEvent {
	Flushed = "cache.flushed",
	Forgotten = "cache.forgotten",
	Hit = "cache.hit",
	Missed = "cache.missed",
	Written = "cache.written",
}

export enum CryptoEvent {
	MilestoneChanged = "crypto.milestone.changed",
}

export enum BlockEvent {
	Applied = "block.applied",
	Forged = "block.forged",
	Invalid = "block.invalid",
	Received = "block.received",
}

export enum ValidatorEvent {
	Registered = "validator.registered",
	Resigned = "validator.resigned",
}

export enum VoteEvent {
	Vote = "wallet.vote",
	Unvote = "wallet.unvote",
}

export enum PeerEvent {
	Added = "peer.added",
	Disconnect = "peer.disconnect",
	Disconnected = "peer.disconnected",
	Disconnecting = "peer.disconnecting",
	Removed = "peer.removed",
}

export enum ConsensusEvent {
	Bootstrapped = "consensus.bootstrapped",
	RoundStarted = "consensus.round.started",
	ProposalAccepted = "consensus.proposal.accepted",
	PrevotedProposal = "consensus.prevoted.proposal",
	PrevotedAny = "consensus.prevoted.any",
	PrevotedNull = "consensus.prevoted.null",
	PrecommitedAny = "consensus.precommited.any",
	PrecommitedProposal = "consensus.precommited.proposal",
}

export enum ApiNodeEvent {
	Added = "apiNode.added",
	Removed = "apiNode.removed",
}

export enum StateEvent {
	BuilderFinished = "state.builder.finished",
	Started = "state.started",
	Starting = "state.starting",
}

export enum TransactionEvent {
	AddedToPool = "transaction.pool.added",
	Applied = "transaction.applied",
	Expired = "transaction.expired",
	RejectedByPool = "transaction.pool.rejected",
	RemovedFromPool = "transaction.pool.removed",
}

export enum ScheduleEvent {
	BlockJobFinished = "schedule.blockJob.finished",
	CronJobFinished = "schedule.cronJob.finished",
}

export enum QueueEvent {
	Finished = "queue.finished",
	Failed = "queue.failed",
}
