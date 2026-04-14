use std::collections::BTreeMap;

use alloy_sol_types::SolEvent;
use revm::{
    context::result::ExecutionResult,
    database::{DatabaseCommitExt, WrapDatabaseRef},
    primitives::{Address, B256, map::HashMap},
};

use crate::{
    db::{CommitData, CommitKey, Error, GenesisInfo, PendingCommit, PersistentDB},
    state_changes::{self, AccountMergeInfo, AccountUpdate},
    state_root::calculate_commit_hashes,
};

#[derive(Clone, Debug, Default)]
pub struct StateCommit {
    pub key: CommitKey,
    pub change_set: state_changes::StateChangeset,
    pub results: BTreeMap<B256, (ExecutionResult, u64)>,
}

pub fn build_commit(pending_commit: &mut PendingCommit) -> Result<StateCommit, crate::db::Error> {
    assert!(pending_commit.built_commit.is_none());
    let mut state_builder = revm::database::State::builder()
        .with_cached_prestate(std::mem::take(&mut pending_commit.cache))
        .build();

    state_builder.transition_state = Some(std::mem::take(&mut pending_commit.transitions));
    state_builder
        .merge_transitions(revm::database::states::bundle_state::BundleRetention::PlainState);

    let bundle = state_builder.take_bundle();
    let mut change_set = state_changes::bundle_into_change_set(bundle);

    change_set.legacy_attributes = std::mem::take(&mut pending_commit.legacy_attributes);
    change_set.legacy_cold_wallets = std::mem::take(&mut pending_commit.legacy_cold_wallets);
    change_set.merged_legacy_cold_wallets =
        std::mem::take(&mut pending_commit.merged_legacy_cold_wallets)
            .into_iter()
            .filter_map(|(key, legacy)| legacy.map(|v| (key, v)))
            .collect();

    Ok(StateCommit {
        key: pending_commit.key,
        change_set,
        results: std::mem::take(&mut pending_commit.results),
    })
}

pub fn apply_rewards(
    db: &mut PersistentDB,
    pending: &mut PendingCommit,
    rewards: HashMap<Address, u128>,
) -> Result<(), crate::db::Error> {
    let mut state = revm::database::State::builder()
        .with_bundle_update()
        .with_cached_prestate(std::mem::take(&mut pending.cache))
        .with_database(WrapDatabaseRef(&db))
        .build();

    state
        .increment_balances(rewards)
        .map_err(|err| crate::db::Error::State(format!("increment balances err={}", err)))?;

    if let Some(transition_state) = state.transition_state.take() {
        // println!("transition state {:#?}", transition_state);
        pending
            .transitions
            .add_transitions(transition_state.transitions.into_iter());
    }

    pending.cache = std::mem::take(&mut state.cache);
    // println!("cache {:#?}", pending.cache.accounts);

    Ok(())
}

pub fn commit_to_db(
    db: &mut PersistentDB,
    mut pending_commit: PendingCommit,
    commit_data: Option<CommitData>,
) -> Result<Vec<AccountUpdate>, crate::db::Error> {
    let genesis_info = db.genesis_info.clone();
    let mut commit = match pending_commit.built_commit {
        Some(commit) => commit,
        None => build_commit(&mut pending_commit)?,
    };

    let commit_hashes = match pending_commit.commit_hashes {
        Some(commit_hashes) => commit_hashes,
        None => calculate_commit_hashes(&mut commit)?,
    };

    match db.commit(&mut commit, &commit_data, &commit_hashes) {
        Ok(_) => Ok(collect_dirty_accounts(commit, &genesis_info)),
        Err(err) => match &err {
            Error::DbFull => {
                // try to resize the db and attempt another commit on success
                db.resize().and_then(|_| {
                    db.commit(&mut commit, &commit_data, &commit_hashes)
                        .and_then(|_| Ok(collect_dirty_accounts(commit, &genesis_info)))
                })
            }
            _ => Err(err),
        },
    }
}

fn collect_dirty_accounts(
    commit: StateCommit,
    genesis_info: &Option<GenesisInfo>,
) -> Vec<AccountUpdate> {
    let mut dirty_accounts = HashMap::with_capacity(commit.change_set.accounts.len());

    for (address, account) in commit.change_set.accounts {
        if let Some(account) = account {
            dirty_accounts.insert(
                address,
                AccountUpdate {
                    address,
                    balance: account.balance,
                    nonce: account.nonce,
                    vote: None,
                    unvote: None,
                    username: None,
                    username_resigned: false,
                    merge_info: commit
                        .change_set
                        .merged_legacy_cold_wallets
                        .get(&address)
                        .map(|value| AccountMergeInfo {
                            legacy_address: value.1,
                            transaction_hash: value.0,
                        }),
                },
            );
        }
    }

    if let Some(info) = genesis_info {
        for (receipt, _) in commit.results.values() {
            match receipt {
                ExecutionResult::Success { logs, .. } => {
                    for log in logs {
                        match log.address {
                            _ if log.address == info.validator_contract => {
                                // Attempt to decode the log as a Voted event
                                if let Ok(event) = crate::events::Voted::decode_log(&log) {
                                    // println!(
                                    //     "Voted event (from={:?} to={:?})",
                                    //     event.data.voter, event.data.validator,
                                    // );

                                    dirty_accounts.get_mut(&event.voter).and_then(|account| {
                                        account.vote = Some(event.validator);
                                        account.unvote = None; // cancel out any previous unvote if one happened in same commit
                                        Some(account)
                                    });

                                    continue;
                                }

                                // Attempt to decode the log as a Unvoted event
                                if let Ok(event) = crate::events::Unvoted::decode_log(&log) {
                                    // println!(
                                    //     "Unvoted event (from={:?} removed vote={:?})",
                                    //     event.data.voter, event.data.validator,
                                    // );

                                    dirty_accounts.get_mut(&event.voter).and_then(|account| {
                                        account.unvote = Some(event.validator);
                                        account.vote = None; // cancel out any previous vote if one happened in same commit
                                        Some(account)
                                    });

                                    continue;
                                }
                            }
                            _ if log.address == info.username_contract => {
                                // Attempt to decode log as a UsernameRegistered event
                                if let Ok(event) =
                                    crate::events::UsernameRegistered::decode_log(&log)
                                {
                                    dirty_accounts.get_mut(&event.addr).and_then(|account| {
                                        account.username = Some(event.username.clone());
                                        account.username_resigned = false; // cancel out any previous resignation if one happened in same commit
                                        Some(account)
                                    });
                                    continue;
                                }

                                // Attempt to decode log as a UsernameResigned event
                                if let Ok(event) = crate::events::UsernameResigned::decode_log(&log)
                                {
                                    dirty_accounts.get_mut(&event.addr).and_then(|account| {
                                        account.username = None; // cancel out any previous registration if one happened in same commit
                                        account.username_resigned = true;
                                        Some(account)
                                    });
                                    continue;
                                }
                            }
                            _ => (), // ignore
                        }
                    }

                    //
                }
                ExecutionResult::Revert { .. } | ExecutionResult::Halt { .. } => (), // ignore
            }
        }
    }

    dirty_accounts.into_values().collect()
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::{
        db::{GenesisInfo, PendingCommit, PersistentDB},
        events,
        state_changes::{AccountMergeInfo, AccountUpdate, StateChangeset},
        state_commit::{StateCommit, apply_rewards, collect_dirty_accounts},
    };
    use crate::{
        legacy::{LegacyAccountAttributes, LegacyAddress},
        state_changes::StorageChangeset,
    };
    use alloy_primitives::{Address, Log, U256, address};
    use alloy_primitives::{B256, b256};
    use alloy_sol_types::SolEvent;
    use bytes::Bytes;
    use revm::{
        context::result::{ExecutionResult, Output, ResultGas, SuccessReason},
        primitives::HashMap,
    };
    use revm::{database::states::StorageSlot, state::AccountInfo};

    #[test]
    fn test_collect_dirty_accounts() {
        let mut change_set = StateChangeset::default();
        change_set.accounts.push((
            address!("0000000000000000000000000000000000000001"),
            Some(AccountInfo::from_balance(U256::from(1))),
        ));
        change_set.accounts.push((
            address!("0000000000000000000000000000000000000002"),
            Some(AccountInfo::from_balance(U256::from(1))),
        ));

        let genesis_info = GenesisInfo {
            account: address!("0000000000000000000000000000000000000001"),
            deployer_account: address!("0000000000000000000000000000000000000002"),
            validator_contract: address!("0000000000000000000000000000000000000003"),
            username_contract: address!("0000000000000000000000000000000000000004"),
            initial_block_number: 0,
            initial_supply: U256::from(1_000_000),
        };

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

        let mut results = BTreeMap::<B256, (ExecutionResult, u64)>::new();

        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000001"),
            (
                ExecutionResult::Success {
                    reason: SuccessReason::Stop,
                    gas: ResultGas::new(30000, 30000, 0, 0, 0),
                    logs: vec![
                        Log {
                            address: genesis_info.validator_contract,
                            data: events::Voted {
                                validator: address!("0000000000000000000000000000000000000002"),
                                voter: address!("0000000000000000000000000000000000000001"),
                            }
                            .encode_log_data(),
                        },
                        Log {
                            address: genesis_info.validator_contract,
                            data: events::Unvoted {
                                validator: address!("0000000000000000000000000000000000000004"),
                                voter: address!("0000000000000000000000000000000000000002"),
                            }
                            .encode_log_data(),
                        },
                        Log {
                            address: genesis_info.username_contract,
                            data: events::UsernameRegistered {
                                addr: address!("0000000000000000000000000000000000000001"),
                                username: "test".into(),
                                previousUsername: "".into(),
                            }
                            .encode_log_data(),
                        },
                        Log {
                            address: genesis_info.username_contract,
                            data: events::UsernameResigned {
                                addr: address!("0000000000000000000000000000000000000002"),
                                username: "resigned".into(),
                            }
                            .encode_log_data(),
                        },
                        Log {
                            address: genesis_info.validator_contract,
                            ..Default::default()
                        },
                        Log {
                            address: genesis_info.username_contract,
                            ..Default::default()
                        },
                        Log {
                            address: address!("0000000000000000000000000000000000000000"),
                            ..Default::default()
                        },
                    ],
                    output: Output::Create(
                        alloy_primitives::Bytes(Bytes::new()),
                        Some(address!("0000000000000000000000000000000000000001")),
                    ),
                },
                0,
            ),
        );

        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000002"),
            (
                ExecutionResult::Revert {
                    gas: ResultGas::new(30000, 30000, 0, 0, 0),
                    logs: vec![],
                    output: alloy_primitives::Bytes(Bytes::new()),
                },
                0,
            ),
        );

        let state = StateCommit {
            change_set,
            results,
            ..Default::default()
        };

        let mut account_updates = collect_dirty_accounts(state, &Some(genesis_info));
        account_updates.sort_by_key(|k| k.address);

        assert_eq!(
            account_updates,
            vec![
                AccountUpdate {
                    address: address!("0000000000000000000000000000000000000001"),
                    balance: U256::ONE,
                    nonce: 0,
                    vote: Some(address!("0000000000000000000000000000000000000002")),
                    unvote: None,
                    username: Some("test".into()),
                    username_resigned: false,
                    merge_info: Some(AccountMergeInfo {
                        legacy_address: "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap(),
                        transaction_hash: b256!(
                            "0000000000000000000000000000000000000000000000000000000000000001"
                        )
                    })
                },
                AccountUpdate {
                    address: address!("0000000000000000000000000000000000000002"),
                    balance: U256::ONE,
                    nonce: 0,
                    vote: None,
                    unvote: Some(address!("0000000000000000000000000000000000000004")),
                    username: None,
                    username_resigned: true,
                    merge_info: None
                }
            ]
        );
    }

    #[test]
    fn test_apply_rewards() {
        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        let mut db = PersistentDB::new(crate::db::PersistentDBOptions::new(
            path.path().to_path_buf(),
        ))
        .expect("database");
        let mut pending = PendingCommit::default();

        let account1 = revm::primitives::address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let account2 = revm::primitives::address!("ad6f65c58a46427af4b257cbe231d0ed69ed5508");

        let mut rewards = HashMap::<Address, u128>::default();
        rewards.insert(account1, 1234);
        rewards.insert(account2, 0);

        let result = apply_rewards(&mut db, &mut pending, rewards);
        assert!(result.is_ok());

        let cache_account1 = pending.cache.accounts.get(&account1).expect("account1");
        assert!(cache_account1.account.is_some());
        assert_eq!(
            cache_account1.status,
            revm::database::AccountStatus::InMemoryChange
        );

        let cache_account2 = pending.cache.accounts.get(&account2).expect("account2");
        assert!(cache_account2.account.is_none());
        assert_eq!(
            cache_account2.status,
            revm::database::AccountStatus::Destroyed
        );

        let transition_account1 = pending
            .transitions
            .transitions
            .get(&account1)
            .expect("transition_account1");
        assert!(transition_account1.info.is_some());
        assert_eq!(
            transition_account1.status,
            revm::database::AccountStatus::InMemoryChange
        );
        assert_eq!(transition_account1.storage_was_destroyed, false);

        let transition_account2 = pending
            .transitions
            .transitions
            .get(&account2)
            .expect("transition_account2");
        assert!(transition_account2.info.is_none());
        assert_eq!(
            transition_account2.status,
            revm::database::AccountStatus::Destroyed
        );
        assert_eq!(transition_account2.storage_was_destroyed, true);
    }
}
