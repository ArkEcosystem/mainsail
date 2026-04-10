use alloy_primitives::Keccak256;
use rayon::{
    iter::{IntoParallelRefMutIterator, ParallelIterator},
    slice::ParallelSliceMut,
};
use revm::primitives::{B256, keccak256};
use serde::Serialize;
use std::io::{self, Write};

use crate::{
    db::{CommitHashes, GenesisInfo, PendingCommit, PersistentDB},
    state_changes::StateChangeset,
    state_commit::{StateCommit, build_commit},
};

pub fn calculate(
    db: &mut PersistentDB,
    pending_commit: &mut PendingCommit,
    current_hash: B256,
) -> Result<B256, crate::db::Error> {
    let mut committed_hashes = db.get_committed_hashes(pending_commit.key.0)?;
    match (&mut committed_hashes, &pending_commit.commit_hashes) {
        (None, Some(committed)) => {
            // take existing
            committed_hashes.replace(committed.clone());
        }
        (Some(committed), Some(pending)) => {
            assert_eq!(committed, pending);
        }
        _ => {}
    };

    if pending_commit.built_commit.is_none() {
        let state_commit = build_commit(pending_commit)?;
        pending_commit.built_commit.replace(state_commit);
    };

    let (state_root, commit_hashes) = calculate_state_root(
        current_hash,
        pending_commit
            .built_commit
            .as_mut()
            .expect("state commit exists"),
        committed_hashes,
        &db.genesis_info,
    )?;

    pending_commit.commit_hashes.replace(commit_hashes);

    Ok(state_root)
}

fn calculate_state_root(
    current_hash: B256,
    state: &mut StateCommit,
    committed_hashes: Option<CommitHashes>,
    genesis_info: &Option<GenesisInfo>,
) -> Result<(B256, CommitHashes), crate::db::Error> {
    let commit_hashes = if let Some(committed_hashes) = committed_hashes {
        committed_hashes
    } else {
        calculate_commit_hashes(state)?
    };

    let block_number = state.key.0.to_le_bytes();

    let genesis_info_hash = match genesis_info {
        Some(info) => calculate_hash(info)?,
        None => B256::ZERO,
    };

    let mut hasher = Keccak256::new();
    hasher.update(block_number);
    hasher.update(genesis_info_hash);
    hasher.update(current_hash);
    hasher.update(commit_hashes.accounts_hash);
    hasher.update(commit_hashes.contracts_hash);
    hasher.update(commit_hashes.storage_hash);

    Ok((hasher.finalize(), commit_hashes))
}

pub fn calculate_commit_hashes(state: &mut StateCommit) -> Result<CommitHashes, crate::db::Error> {
    prepare(state);

    Ok(CommitHashes {
        accounts_hash: calculate_accounts_hash(&state.change_set)?,
        contracts_hash: calculate_contracts_hash(&state.change_set)?,
        storage_hash: calculate_storage_hash(&state.change_set)?,
    })
}

pub fn calculate_accounts_hash(state_changes: &StateChangeset) -> Result<B256, crate::db::Error> {
    let mut writer = HashWriter::new();
    hash_serialize_into(&mut writer, &state_changes.accounts)?;

    if !state_changes.legacy_attributes.is_empty() {
        hash_serialize_into(&mut writer, &state_changes.legacy_attributes)?;
    }

    if !state_changes.legacy_cold_wallets.is_empty() {
        hash_serialize_into(&mut writer, &state_changes.legacy_cold_wallets)?;
    }

    if !state_changes.merged_legacy_cold_wallets.is_empty() {
        hash_serialize_into(&mut writer, &state_changes.merged_legacy_cold_wallets)?;
    }

    Ok(writer.finalize())
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

fn prepare(state: &mut StateCommit) {
    state.change_set.accounts.par_sort_unstable_by_key(|a| a.0);
    state.change_set.contracts.par_sort_unstable_by_key(|a| a.0);

    state
        .change_set
        .storage
        .par_iter_mut()
        .for_each(|s| s.storage.par_sort_unstable_by_key(|slot| slot.0));

    state
        .change_set
        .storage
        .par_sort_unstable_by_key(|a| a.address);
}

struct HashWriter {
    hasher: Keccak256,
}

impl HashWriter {
    fn new() -> Self {
        Self {
            hasher: Keccak256::new(),
        }
    }

    fn finalize(self) -> B256 {
        self.hasher.finalize()
    }
}

impl Write for HashWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.hasher.update(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn hash_serialize_into<T: Serialize>(
    writer: &mut HashWriter,
    value: &T,
) -> Result<(), crate::db::Error> {
    bincode::serialize_into(writer, value)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::{
        db::{GenesisInfo, PendingCommit, PersistentDB, PersistentDBOptions},
        legacy::LegacyAddress,
        state_changes::StateChangeset,
        state_commit::{StateCommit, build_commit},
        state_root::{calculate, calculate_state_root},
    };
    use alloy_primitives::{B256, U256, address, b256};

    #[test]
    fn test_calculate_state_root_default() {
        let result =
            calculate_state_root(B256::ZERO, &mut Default::default(), None, &None).expect("ok");
        assert_eq!(
            result,
            revm::primitives::b256!(
                "0722d8002560934d7004b8b849101024bf7ec2aaa2c3396f7292d4ac8cdae5ab"
            )
        );
    }

    #[test]
    fn test_calculate_state_root_storage() {
        use crate::{
            legacy::{LegacyAccountAttributes, LegacyAddress},
            state_changes::StorageChangeset,
        };
        use alloy_primitives::{U256, address, b256};
        use revm::{database::states::StorageSlot, state::AccountInfo};

        let mut change_set = StateChangeset::default();
        change_set.accounts.push((
            address!("0000000000000000000000000000000000000001"),
            Some(AccountInfo::from_balance(U256::from(1))),
        ));

        let storage = vec![
            (
                U256::from(1),
                StorageSlot::new_changed(U256::ZERO, U256::from(1234)),
            ),
            (
                U256::from(2),
                StorageSlot::new_changed(U256::ZERO, U256::from(5678)),
            ),
        ];

        change_set.storage.push(StorageChangeset {
            address: address!("0000000000000000000000000000000000000002"),
            storage,
            ..Default::default()
        });

        change_set.legacy_attributes.insert(
            address!("0000000000000000000000000000000000000001"),
            LegacyAccountAttributes {
                legacy_nonce: Some(5),
                second_public_key: Some("".into()),
                ..Default::default()
            },
        );

        let legacy_address: LegacyAddress =
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap();
        change_set.legacy_cold_wallets.insert(
            legacy_address.clone(),
            crate::legacy::LegacyColdWallet {
                address: legacy_address.clone(),
                balance: U256::from(255),
                legacy_attributes: LegacyAccountAttributes {
                    legacy_nonce: Some(3),
                    ..Default::default()
                },
                ..Default::default()
            },
        );

        change_set.merged_legacy_cold_wallets.insert(
            address!("0000000000000000000000000000000000000001"),
            (
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                legacy_address,
            ),
        );

        let mut state = StateCommit {
            change_set,
            ..Default::default()
        };

        let result = calculate_state_root(B256::ZERO, &mut state, None, &None).expect("ok");
        assert_eq!(
            result,
            revm::primitives::b256!(
                "4a89eeb210b50ac79b17f867e55225c6cd9b253dfbddb6f5c0438720b562f95c"
            )
        );
    }

    #[test]
    fn test_calculate_state_root_committed() {
        let result = calculate_state_root(
            B256::ZERO,
            &mut Default::default(),
            Some((
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                b256!("0000000000000000000000000000000000000000000000000000000000000002"),
                b256!("0000000000000000000000000000000000000000000000000000000000000003"),
            )),
            &Some(GenesisInfo {
                account: address!("0000000000000000000000000000000000000001"),
                deployer_account: address!("0000000000000000000000000000000000000002"),
                validator_contract: address!("0000000000000000000000000000000000000003"),
                username_contract: address!("0000000000000000000000000000000000000004"),
                initial_block_number: 0,
                initial_supply: U256::from(1_000_000),
            }),
        )
        .expect("ok");
        assert_eq!(
            result,
            b256!("4d8a5286c595051367a97a84e8e0cc31ec4ff3b335a300ec713ccfbfd43e0f7d")
        );
    }

    #[test]
    fn test_calculate_with_db() {
        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        let mut db = PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf()))
            .expect("database");

        let result = calculate(
            &mut db,
            &mut Default::default(),
            b256!("0000000000000000000000000000000000000000000000000000000000000000"),
        )
        .expect("ok");

        assert_eq!(
            result,
            revm::primitives::b256!(
                "0722d8002560934d7004b8b849101024bf7ec2aaa2c3396f7292d4ac8cdae5ab"
            )
        );

        let mut pending_commit = PendingCommit::default();
        let legacy_address: LegacyAddress =
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap();
        pending_commit.merged_legacy_cold_wallets.insert(
            address!("0000000000000000000000000000000000000001"),
            Some((
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                legacy_address,
            )),
        );

        let state_commit = build_commit(&mut pending_commit).expect("ok");
        pending_commit.built_commit = Some(state_commit);

        let result = calculate(
            &mut db,
            &mut pending_commit,
            b256!("0000000000000000000000000000000000000000000000000000000000000001"),
        )
        .expect("ok");

        assert_eq!(
            result,
            revm::primitives::b256!(
                "5ca756d93a56e6c15c9e182ff236bd5db21bcde81c2c438d58a32bbd16b4ec3a"
            )
        );
    }
}
