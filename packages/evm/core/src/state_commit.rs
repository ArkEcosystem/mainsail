use std::collections::HashMap;

use revm::primitives::{ExecutionResult, B256};

use crate::{
    db::{CommitKey, Error, PendingCommit, PersistentDB},
    state_changes,
};

pub struct StateCommit {
    pub key: CommitKey,
    pub change_set: state_changes::StateChangeset,
    pub results: HashMap<B256, ExecutionResult>,
}

pub fn build_commit(pending_commit: PendingCommit) -> StateCommit {
    let PendingCommit {
        key,
        cache,
        results,
        transitions,
    } = pending_commit;

    let mut state_builder = revm::State::builder().with_cached_prestate(cache).build();

    state_builder.transition_state = Some(transitions);
    state_builder.merge_transitions(revm::db::states::bundle_state::BundleRetention::PlainState);

    let bundle = state_builder.take_bundle();
    let change_set = state_changes::bundle_into_change_set(bundle);

    StateCommit {
        key,
        change_set,
        results,
    }
}

pub fn commit_to_db(
    db: &PersistentDB,
    pending_commit: PendingCommit,
) -> Result<(), crate::db::Error> {
    let mut commit = build_commit(pending_commit);

    match db.commit(&mut commit) {
        Ok(_) => Ok(()),
        Err(err) => match &err {
            Error::DbFull => {
                // try to resize the db and attempt another commit on success
                db.resize().and_then(|_| db.commit(&mut commit))
            }
            _ => Err(err),
        },
    }
}
