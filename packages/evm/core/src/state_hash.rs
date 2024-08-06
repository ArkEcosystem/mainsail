use rayon::slice::ParallelSliceMut;
use revm::primitives::{keccak256, B256};
use serde::Serialize;

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
    let committed_hashes = db.get_committed_hashes(pending_commit.key.0)?;
    let state_commit = build_commit(db, pending_commit, false)?;

    calculate_state_hash(current_hash, &state_commit, committed_hashes)
}

fn calculate_state_hash(
    current_hash: B256,
    state: &StateCommit,
    committed_hashes: Option<(B256, B256, B256)>,
) -> Result<B256, crate::db::Error> {
    let (accounts_hash, contracts_hash, storage_hash) =
        if let Some(committed_hashes) = committed_hashes {
            committed_hashes
        } else {
            let state_changes = prepare(state);

            (
                calculate_accounts_hash(&state_changes)?,
                calculate_contracts_hash(&state_changes)?,
                calculate_storage_hash(&state_changes)?,
            )
        };

    let result = keccak256(
        [
            state.key.0.to_le_bytes().as_slice(),
            current_hash.as_slice(),
            accounts_hash.as_slice(),
            contracts_hash.as_slice(),
            storage_hash.as_slice(),
        ]
        .concat(),
    );

    Ok(result)
}

pub fn calculate_accounts_hash(state_changes: &StateChangeset) -> Result<B256, crate::db::Error> {
    calculate_hash(&state_changes.accounts)
}

pub fn calculate_contracts_hash(state_changes: &StateChangeset) -> Result<B256, crate::db::Error> {
    calculate_hash(&state_changes.contracts)
}

pub fn calculate_storage_hash(state_changes: &StateChangeset) -> Result<B256, crate::db::Error> {
    calculate_hash(&state_changes.storage)
}

fn calculate_hash<T>(value: &T) -> Result<B256, crate::db::Error>
where
    T: Serialize,
{
    Ok(keccak256(bincode::serialize(value)?))
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
    let result = calculate_state_hash(B256::ZERO, &Default::default(), None).expect("ok");
    assert_eq!(
        result,
        revm::primitives::b256!("d704de6546d2278905030a0c9f180a649964dbae8112f250a72a01629ec25f83")
    );
}
