use rayon::slice::ParallelSliceMut;
use revm::primitives::{keccak256, B256};

use crate::{
    db::{PendingCommit, PersistentDB},
    state_changes::StateChangeset,
    state_commit::{build_commit, StateCommit},
};

pub fn calculate(
    db: &mut PersistentDB,
    pending_commit: PendingCommit,
    current_hash: B256,
) -> Result<B256, crate::db::Error> {
    let state_commit = build_commit(db, pending_commit, false)?;

    Ok(calculate_state_hash(current_hash, &state_commit)?)
}

fn calculate_state_hash(current_hash: B256, state: &StateCommit) -> Result<B256, crate::db::Error> {
    let commit_hash = keccak256(bincode::serialize(&prepare(state))?);
    let result = keccak256([current_hash.as_slice(), commit_hash.as_slice()].concat());

    Ok(result)
}

fn prepare(state: &StateCommit) -> StateChangeset {
    let mut c = state.change_set.clone();

    c.accounts.par_sort_by_key(|a| a.0);
    c.contracts.par_sort_by_key(|a| a.0);
    for s in &mut c.storage {
        s.storage.par_sort_by_key(|slot| slot.0);
    }
    c.storage.par_sort_by_key(|a| a.address);
    c
}

#[test]
fn test_calculate_state_hash() {
    let result = calculate_state_hash(B256::ZERO, &Default::default()).expect("ok");
    assert_eq!(
        result,
        revm::primitives::b256!("dac7965a57e662c4fe4f2a69213893eec7dd9c0c1650ebf058659dc6fa017720")
    );
}
