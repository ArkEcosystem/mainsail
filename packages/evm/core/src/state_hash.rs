use rayon::slice::ParallelSliceMut;
use revm::primitives::{B256, keccak256};
use serde::Serialize;

use crate::{
    db::{GenesisInfo, PendingCommit, PersistentDB},
    state_changes::StateChangeset,
    state_commit::{StateCommit, build_commit},
};

pub fn calculate(
    db: &mut PersistentDB,
    pending_commit: &mut PendingCommit,
    current_hash: B256,
) -> Result<B256, crate::db::Error> {
    let committed_hashes = db.get_committed_hashes(pending_commit.key.0)?;

    if pending_commit.built_commit.is_none() {
        let state_commit = build_commit(pending_commit)?;
        pending_commit.built_commit.replace(state_commit);
    };

    calculate_state_hash(
        current_hash,
        pending_commit
            .built_commit
            .as_ref()
            .expect("state commit exists"),
        committed_hashes,
        &db.genesis_info,
    )
}

fn calculate_state_hash(
    current_hash: B256,
    state: &StateCommit,
    committed_hashes: Option<(B256, B256, B256)>,
    genesis_info: &Option<GenesisInfo>,
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

    let mut hashes = Vec::with_capacity(5);

    let height = state.key.0.to_le_bytes();
    hashes.push(height.as_slice());

    let genesis_info_hash = match genesis_info {
        Some(info) => calculate_hash(info)?,
        None => B256::ZERO,
    };

    hashes.push(genesis_info_hash.as_slice());
    hashes.push(current_hash.as_slice());
    hashes.push(accounts_hash.as_slice());
    hashes.push(contracts_hash.as_slice());
    hashes.push(storage_hash.as_slice());

    let result = keccak256(hashes.concat());

    Ok(result)
}

pub fn calculate_accounts_hash(state_changes: &StateChangeset) -> Result<B256, crate::db::Error> {
    let mut hashes = Vec::with_capacity(4);
    hashes.push(calculate_hash(&state_changes.accounts)?);

    if !state_changes.legacy_attributes.is_empty() {
        hashes.push(calculate_hash(&state_changes.legacy_attributes)?);
    }

    if !state_changes.legacy_cold_wallets.is_empty() {
        hashes.push(calculate_hash(&state_changes.legacy_cold_wallets)?);
    }

    if !state_changes.merged_legacy_cold_wallets.is_empty() {
        hashes.push(calculate_hash(&state_changes.merged_legacy_cold_wallets)?);
    }

    if hashes.len() == 1 {
        Ok(hashes.remove(0))
    } else {
        Ok(keccak256(hashes.concat()))
    }
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
    let result = calculate_state_hash(B256::ZERO, &Default::default(), None, &None).expect("ok");
    assert_eq!(
        result,
        revm::primitives::b256!("0722d8002560934d7004b8b849101024bf7ec2aaa2c3396f7292d4ac8cdae5ab")
    );
}
