use std::collections::HashMap;

use revm::{
    db::WrapDatabaseRef,
    primitives::{Address, ExecutionResult, B256},
};

use crate::{
    db::{CommitKey, Error, PendingCommit, PersistentDB},
    state_changes,
};

#[derive(Debug, Default)]
pub struct StateCommit {
    pub key: CommitKey,
    pub change_set: state_changes::StateChangeset,
    pub results: HashMap<B256, ExecutionResult>,
}

pub fn build_commit(
    db: &mut PersistentDB,
    pending_commit: PendingCommit,
    is_commit_to_db: bool,
) -> Result<StateCommit, crate::db::Error> {
    let _ = is_commit_to_db;
    let _ = db;

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

    Ok(StateCommit {
        key,
        change_set,
        results,
    })
}

pub fn apply_rewards(
    db: &mut PersistentDB,
    pending: &mut PendingCommit,
    rewards: HashMap<Address, u128>,
) -> Result<(), crate::db::Error> {
    let mut state = revm::State::builder()
        .with_bundle_update()
        .with_cached_prestate(std::mem::take(&mut pending.cache))
        .with_database(WrapDatabaseRef(&db))
        .build();

    state.increment_balances(rewards)?;
    println!("transition state {:#?}", state.transition_state.take());

    pending.cache = std::mem::take(&mut state.cache);

    Ok(())
}

pub fn commit_to_db(
    db: &mut PersistentDB,
    pending_commit: PendingCommit,
) -> Result<(), crate::db::Error> {
    let mut commit = build_commit(db, pending_commit, true)?;

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
