use std::{borrow::Cow, collections::BTreeMap};

use alloy_sol_types::SolEvent;
use rayon::{
    iter::{IntoParallelRefMutIterator, ParallelIterator},
    slice::ParallelSliceMut,
};
use revm::{
    context::result::ExecutionResult,
    database::{DatabaseCommitExt, TransitionAccount, WrapDatabaseRef},
    primitives::{Address, B256, map::HashMap},
    state::{EvmStorage, EvmStorageSlot, TransactionId},
};

use crate::{
    db::{CommitData, CommitKey, Error, GenesisInfo, PendingCommit, PersistentDB},
    state_changes::{self, AccountMergeInfo, AccountUpdate},
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

    let mut state_commit = StateCommit {
        key: pending_commit.key,
        change_set,
        results: std::mem::take(&mut pending_commit.results),
    };

    finalize(&mut state_commit);

    Ok(state_commit)
}

pub fn apply_rewards(
    db: &PersistentDB,
    pending: &mut PendingCommit,
    rewards: HashMap<Address, u128>,
) -> Result<(), crate::db::Error> {
    let mut state = revm::database::State::builder()
        .with_bundle_update()
        .with_cached_prestate(std::mem::take(&mut pending.cache))
        .with_database(WrapDatabaseRef(&db))
        .build();

    let result = state
        .increment_balances(rewards)
        .map_err(|err| crate::db::Error::State(format!("increment balances err={}", err)));

    // `increment_balances` short-circuits before committing any transition, so on error
    // the state carries no reward changes. Only fold transitions in on success; always
    // return the prestate cache so a recoverable failure never leaves `pending` empty.
    if result.is_ok() {
        if let Some(transition_state) = state.transition_state.take() {
            pending.transitions.add_transitions(
                transition_state
                    .transitions
                    .into_iter()
                    .map(|(address, account)| (address, into_evm_transition(account))),
            );
        }
    }

    pending.cache = std::mem::take(&mut state.cache);
    // println!("cache {:#?}", pending.cache.accounts);

    result
}

/// `TransitionState::add_transitions` expects the EVM-side storage representation;
/// convert an already-flattened transition back into it.
pub fn into_evm_transition(
    account: TransitionAccount,
) -> TransitionAccount<Option<Cow<'static, EvmStorage>>> {
    account.map_storage(|storage| {
        Some(Cow::Owned(
            storage
                .into_iter()
                .map(|(key, slot)| {
                    (
                        key,
                        EvmStorageSlot::new_changed(
                            slot.previous_or_original_value,
                            slot.present_value,
                            TransactionId::default(),
                        ),
                    )
                })
                .collect(),
        ))
    })
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

    commit_with_resize_retry(|| db.commit(&mut commit, &commit_data), || db.resize())?;

    Ok(collect_dirty_accounts(commit, &genesis_info))
}

/// Maximum number of resize-and-retry attempts after an initial `DbFull` on commit.
const MAX_RESIZE_RETRIES: usize = 3;

fn commit_with_resize_retry(
    mut try_commit: impl FnMut() -> Result<(), Error>,
    mut resize: impl FnMut() -> Result<(), Error>,
) -> Result<(), Error> {
    for _ in 0..=MAX_RESIZE_RETRIES {
        match try_commit() {
            Ok(()) => return Ok(()),
            Err(Error::DbFull) => resize()?,
            Err(err) => return Err(err),
        }
    }
    Err(Error::DbFull)
}

fn finalize(state: &mut StateCommit) {
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

fn collect_dirty_accounts(
    commit: StateCommit,
    genesis_info: &Option<GenesisInfo>,
) -> Vec<AccountUpdate> {
    let mut dirty_accounts = HashMap::with_capacity(commit.change_set.accounts.len());

    for (address, account) in commit.change_set.accounts {
        // A destroyed (selfdestructed) account comes through as `None`; surface it as a
        // zeroed update so consumers drop the stale balance — mirroring the history
        // table, which records deletions as a default account.
        let account = account.unwrap_or_default();

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

    if let Some(info) = genesis_info {
        // `results` is keyed by tx hash, but the "last event wins" folds below must see
        // events in execution order. Cumulative gas is strictly increasing per executed
        // transaction, so it recovers that order: every executed transaction consumes at
        // least the 21000-gas intrinsic cost, so each entry's cumulative total is strictly
        // greater than the previous one's — the key is guaranteed unique and monotonic,
        // never tied.
        let mut results: Vec<&(ExecutionResult, u64)> = commit.results.values().collect();
        results.sort_by_key(|(_, cumulative_gas_used)| *cumulative_gas_used);

        for (receipt, _) in results {
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

    use super::commit_with_resize_retry;
    use crate::{
        db::{Error, GenesisInfo, PendingCommit, PersistentDB},
        events,
        state_changes::{AccountMergeInfo, AccountUpdate, StateChangeset},
        state_commit::{StateCommit, apply_rewards, build_commit, collect_dirty_accounts},
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
                    gas: ResultGas::new_with_state_gas(30000, 30000, 0, 0),
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
                    gas: ResultGas::new_with_state_gas(30000, 30000, 0, 0),
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
    fn test_collect_dirty_accounts_includes_destroyed_accounts() {
        let destroyed = address!("0000000000000000000000000000000000000001");
        let alive = address!("0000000000000000000000000000000000000002");

        let mut change_set = StateChangeset::default();
        change_set.accounts.push((destroyed, None));
        change_set
            .accounts
            .push((alive, Some(AccountInfo::from_balance(U256::from(7)))));

        let state = StateCommit {
            change_set,
            ..Default::default()
        };

        let mut account_updates = collect_dirty_accounts(state, &None);
        account_updates.sort_by_key(|u| u.address);

        // A selfdestructed account must surface as a zeroed update — consumers (api-sync
        // wallet table) would otherwise keep the stale pre-destruction balance forever.
        assert_eq!(
            account_updates,
            vec![
                AccountUpdate {
                    address: destroyed,
                    balance: U256::ZERO,
                    nonce: 0,
                    ..Default::default()
                },
                AccountUpdate {
                    address: alive,
                    balance: U256::from(7),
                    nonce: 0,
                    ..Default::default()
                }
            ]
        );
    }

    #[test]
    fn test_collect_dirty_accounts_folds_events_in_execution_order() {
        let voter = address!("0000000000000000000000000000000000000001");
        let validator = address!("0000000000000000000000000000000000000002");

        let genesis_info = GenesisInfo {
            account: address!("0000000000000000000000000000000000000001"),
            deployer_account: address!("0000000000000000000000000000000000000002"),
            validator_contract: address!("0000000000000000000000000000000000000003"),
            username_contract: address!("0000000000000000000000000000000000000004"),
            initial_block_number: 0,
            initial_supply: U256::from(1_000_000),
        };

        let mut change_set = StateChangeset::default();
        change_set
            .accounts
            .push((voter, Some(AccountInfo::from_balance(U256::ONE))));

        let success = |log: Log| ExecutionResult::Success {
            reason: SuccessReason::Stop,
            gas: ResultGas::new_with_state_gas(30000, 30000, 0, 0),
            logs: vec![log],
            output: Output::Call(alloy_primitives::Bytes(Bytes::new())),
        };

        // Execution order (= cumulative gas order): vote, unvote, register, resign.
        // The tx hashes sort in exactly the reverse order, so a fold iterating the
        // hash-keyed BTreeMap directly would end up with vote + username instead.
        let mut results = BTreeMap::<B256, (ExecutionResult, u64)>::new();
        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000004"),
            (
                success(Log {
                    address: genesis_info.validator_contract,
                    data: events::Voted { validator, voter }.encode_log_data(),
                }),
                21000,
            ),
        );
        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000003"),
            (
                success(Log {
                    address: genesis_info.validator_contract,
                    data: events::Unvoted { validator, voter }.encode_log_data(),
                }),
                42000,
            ),
        );
        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000002"),
            (
                success(Log {
                    address: genesis_info.username_contract,
                    data: events::UsernameRegistered {
                        addr: voter,
                        username: "test".into(),
                        previousUsername: "".into(),
                    }
                    .encode_log_data(),
                }),
                63000,
            ),
        );
        results.insert(
            b256!("0000000000000000000000000000000000000000000000000000000000000001"),
            (
                success(Log {
                    address: genesis_info.username_contract,
                    data: events::UsernameResigned {
                        addr: voter,
                        username: "test".into(),
                    }
                    .encode_log_data(),
                }),
                84000,
            ),
        );

        let state = StateCommit {
            change_set,
            results,
            ..Default::default()
        };

        let account_updates = collect_dirty_accounts(state, &Some(genesis_info));

        assert_eq!(
            account_updates,
            vec![AccountUpdate {
                address: voter,
                balance: U256::ONE,
                nonce: 0,
                vote: None,
                unvote: Some(validator),
                username: None,
                username_resigned: true,
                merge_info: None
            }]
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
            revm::database::AccountStatus::LoadedNotExisting
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

        let transition_account2 = pending.transitions.transitions.get(&account2);
        assert_eq!(transition_account2, None);
    }

    #[test]
    fn commit_succeeds_without_resizing() {
        let mut commits = 0;
        let mut resizes = 0;

        let result = commit_with_resize_retry(
            || {
                commits += 1;
                Ok(())
            },
            || {
                resizes += 1;
                Ok(())
            },
        );

        assert!(result.is_ok());
        assert_eq!(commits, 1); // committed on the first attempt
        assert_eq!(resizes, 0); // never had to grow the map
    }

    #[test]
    fn commit_recovers_after_one_resize() {
        let mut commits = 0;
        let mut resizes = 0;

        let result = commit_with_resize_retry(
            || {
                commits += 1;
                if commits == 1 {
                    Err(Error::DbFull)
                } else {
                    Ok(())
                }
            },
            || {
                resizes += 1;
                Ok(())
            },
        );

        assert!(result.is_ok());
        assert_eq!(commits, 2); // one DbFull, then success
        assert_eq!(resizes, 1);
    }

    #[test]
    fn commit_recovers_after_two_resizes() {
        let mut commits = 0;
        let mut resizes = 0;

        let result = commit_with_resize_retry(
            || {
                commits += 1;
                if commits <= 2 {
                    Err(Error::DbFull)
                } else {
                    Ok(())
                }
            },
            || {
                resizes += 1;
                Ok(())
            },
        );

        assert!(result.is_ok());
        assert_eq!(commits, 3); // two DbFull, then success
        assert_eq!(resizes, 2);
    }

    #[test]
    fn commit_gives_up_after_max_retries() {
        let mut commits = 0;
        let mut resizes = 0;

        let result = commit_with_resize_retry(
            || {
                commits += 1;
                Err(Error::DbFull) // never fits, no matter how often we grow
            },
            || {
                resizes += 1;
                Ok(())
            },
        );

        assert!(matches!(result, Err(Error::DbFull)));
        assert_eq!(commits, 4); // initial attempt + MAX_RESIZE_RETRIES (3)
        assert_eq!(resizes, 4); // a resize follows every DbFull
    }

    #[test]
    fn commit_propagates_non_dbfull_error_without_resizing() {
        let mut resizes = 0;

        let result = commit_with_resize_retry(
            || Err(Error::Lock),
            || {
                resizes += 1;
                Ok(())
            },
        );

        assert!(matches!(result, Err(Error::Lock)));
        assert_eq!(resizes, 0); // non-DbFull errors return immediately
    }

    /// `build_commit` derives the committed change set from a pending commit's `transitions`,
    /// not from its account `cache`. Emptying the cache before building must therefore produce
    /// an identical change set.
    #[test]
    fn build_commit_is_independent_of_a_drained_cache() {
        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();
        let db = PersistentDB::new(crate::db::PersistentDBOptions::new(
            path.path().to_path_buf(),
        ))
        .expect("database");

        let account = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let mut rewards = HashMap::<Address, u128>::default();
        rewards.insert(account, 1234);

        let mut pending = PendingCommit::default();
        apply_rewards(&db, &mut pending, rewards).expect("apply rewards");
        assert!(pending.cache.accounts.contains_key(&account));
        assert!(pending.transitions.transitions.contains_key(&account));

        // Baseline: build with the cache intact.
        let mut intact = pending.clone();
        let intact_commit = build_commit(&mut intact).expect("build intact");

        // Build again with the cache emptied but the transitions kept.
        let mut drained = pending.clone();
        drained.cache = Default::default();
        assert!(drained.cache.accounts.is_empty());
        assert!(drained.transitions.transitions.contains_key(&account));
        let drained_commit = build_commit(&mut drained).expect("build drained");

        assert_eq!(
            format!("{:?}", intact_commit.change_set),
            format!("{:?}", drained_commit.change_set),
            "draining the cache must not change the committed change set"
        );
    }

    /// A transaction executes against the pending commit's account cache as its prestate. An
    /// account credited only in the cache (not yet committed to the database) is visible to a
    /// transfer from it: the transfer succeeds against the populated cache, and fails with
    /// insufficient funds against an empty cache.
    #[test]
    fn drained_cache_diverges_a_dependent_transaction() {
        use revm::{
            Context, ExecuteEvm, MainBuilder, MainContext,
            context::{BlockEnv, TxEnv},
            database::{CacheState, State, WrapDatabaseRef},
            primitives::{TxKind, hardfork::SpecId},
        };

        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();
        let db = PersistentDB::new(crate::db::PersistentDBOptions::new(
            path.path().to_path_buf(),
        ))
        .expect("database");

        let account = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let recipient = address!("ad6f65c58a46427af4b257cbe231d0ed69ed5508");
        let mut pending = PendingCommit::default();
        let mut rewards = HashMap::<Address, u128>::default();
        rewards.insert(account, 1_000_000);
        apply_rewards(&db, &mut pending, rewards).expect("apply rewards");

        let run_transfer = |prestate: CacheState| -> bool {
            let state = State::builder()
                .with_bundle_update()
                .with_cached_prestate(prestate)
                .with_database(WrapDatabaseRef(&db))
                .build();

            let mut evm = Context::mainnet()
                .with_db(state)
                .modify_cfg_chained(|cfg| {
                    cfg.spec = SpecId::SHANGHAI;
                    cfg.disable_nonce_check = true;
                })
                .modify_block_chained(|block: &mut BlockEnv| {
                    block.gas_limit = 30_000_000;
                })
                .modify_tx_chained(|tx: &mut TxEnv| {
                    tx.caller = account;
                    tx.kind = TxKind::Call(recipient);
                    tx.value = U256::from(1);
                    tx.gas_limit = 21_000;
                    tx.gas_price = 0;
                    tx.gas_priority_fee = None;
                    tx.nonce = 0;
                })
                .build_mainnet();

            matches!(evm.replay(), Ok(result) if result.result.is_success())
        };

        assert!(
            run_transfer(pending.cache.clone()),
            "transfer should succeed against the populated cache"
        );
        assert!(
            !run_transfer(CacheState::default()),
            "transfer must NOT succeed against the empty cache"
        );
    }

    /// A transaction that fails validation (here, spending more than its balance) leaves the
    /// cached account state untouched: the sender's balance is unchanged and the recipient is
    /// not credited.
    #[test]
    fn failed_replay_does_not_mutate_state_cache() {
        use revm::{
            Context, ExecuteEvm, MainBuilder, MainContext,
            context::{BlockEnv, ContextTr, TxEnv},
            database::{State, WrapDatabaseRef},
            handler::EvmTr,
            primitives::{TxKind, hardfork::SpecId},
        };

        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();
        let db = PersistentDB::new(crate::db::PersistentDBOptions::new(
            path.path().to_path_buf(),
        ))
        .expect("database");

        // Prestate: `from` holds exactly `balance`.
        let from = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let recipient = address!("ad6f65c58a46427af4b257cbe231d0ed69ed5508");
        let balance: u128 = 1_000;
        let mut pending = PendingCommit::default();
        let mut rewards = HashMap::<Address, u128>::default();
        rewards.insert(from, balance);
        apply_rewards(&db, &mut pending, rewards).expect("seed prestate");

        let state = State::builder()
            .with_bundle_update()
            .with_cached_prestate(pending.cache.clone())
            .with_database(WrapDatabaseRef(&db))
            .build();

        // A transfer that fails validation (spends more than `balance`).
        let mut evm = Context::mainnet()
            .with_db(state)
            .modify_cfg_chained(|cfg| {
                cfg.spec = SpecId::SHANGHAI;
                cfg.disable_nonce_check = true;
            })
            .modify_block_chained(|block: &mut BlockEnv| {
                block.gas_limit = 30_000_000;
            })
            .modify_tx_chained(|tx: &mut TxEnv| {
                tx.caller = from;
                tx.kind = TxKind::Call(recipient);
                tx.value = U256::from(balance + 1);
                tx.gas_limit = 21_000;
                tx.gas_price = 0;
                tx.gas_priority_fee = None;
                tx.nonce = 0;
            })
            .build_mainnet();

        assert!(
            evm.replay().is_err(),
            "transfer must fail (insufficient funds)"
        );

        // The failed replay must not have mutated the cached prestate.
        let ctx = evm.ctx_mut();
        let cache = &ctx.db().cache;
        let from_balance = cache
            .accounts
            .get(&from)
            .and_then(|a| a.account.as_ref())
            .map(|a| a.info.balance)
            .expect("from cached");
        assert_eq!(
            from_balance,
            U256::from(balance),
            "from balance must be unchanged after a failed tx"
        );
        let recipient_balance = cache
            .accounts
            .get(&recipient)
            .and_then(|a| a.account.as_ref())
            .map(|a| a.info.balance)
            .unwrap_or(U256::ZERO);
        assert_eq!(
            recipient_balance,
            U256::ZERO,
            "recipient must not be credited by a failed tx"
        );
    }
}
