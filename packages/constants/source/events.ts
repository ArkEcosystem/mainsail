export enum KernelEvent {
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
	Missed = "block.missed",
}

export enum ValidatorEvent {
	Registered = "validator.registered",
	Resigned = "validator.resigned",
	Updated = "validator.updated",
}

export enum VoteEvent {
	Voted = "wallet.voted",
	Unvoted = "wallet.unvoted",
}

export enum UsernameEvent {
	Registered = "username.registered",
	Resigned = "username.resigned",
}

export enum PeerEvent {
	Added = "peer.added",
	Removed = "peer.removed",
	Updated = "peer.updated",
}

export enum ConsensusEvent {
	Bootstrapped = "consensus.bootstrapped",
	RoundStarted = "consensus.round.started",
	Proposed = "consensus.proposed",
	ProposalAccepted = "consensus.proposal.accepted",
	PrevotedProposal = "consensus.prevoted.proposal",
	PrevotedAny = "consensus.prevoted.any",
	PrevotedNull = "consensus.prevoted.null",
	PrecommittedAny = "consensus.precommitted.any",
	PrecommittedProposal = "consensus.precommitted.proposal",
}

export enum DeployerEvent {
	ContractCreated = "deployer.contractCreated",
}

export enum ApiNodeEvent {
	Added = "apiNode.added",
	Removed = "apiNode.removed",
}

export enum TransactionEvent {
	AddedToPool = "transaction.pool.added",
	Applied = "transaction.applied",
	Expired = "transaction.expired",
	RejectedByPool = "transaction.pool.rejected",
	RemovedFromPool = "transaction.pool.removed",
}

export enum EvmEvent {
	TransactionReceipt = "evm.transaction.receipt",
}

export enum ScheduleEvent {
	BlockJobFinished = "schedule.blockJob.finished",
	BlockJobFailed = "schedule.blockJob.failed",
	CronJobFinished = "schedule.cronJob.finished",
	CronJobFailed = "schedule.cronJob.failed",
}

export enum QueueEvent {
	Finished = "queue.finished",
	Failed = "queue.failed",
}

export enum WebhookEvent {
	Broadcasted = "webhooks.broadcasted",
	Failed = "webhooks.failed",
	Created = "webhooks.created",
	Updated = "webhooks.updated",
	Removed = "webhooks.removed",
}
