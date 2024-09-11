use std::collections::{BTreeMap, HashMap};

use alloy_sol_types::SolEvent;
use revm::{
    db::WrapDatabaseRef,
    primitives::{Address, ExecutionResult, B256},
};

use crate::{
    db::{CommitKey, Error, GenesisInfo, PendingCommit, PersistentDB},
    state_changes::{self, AccountUpdate},
};

#[derive(Debug, Default)]
pub struct StateCommit {
    pub key: CommitKey,
    pub change_set: state_changes::StateChangeset,
    pub results: BTreeMap<B256, ExecutionResult>,
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

    if let Some(transition_state) = state.transition_state.take() {
        // println!("transition state {:#?}", transition_state);
        pending
            .transitions
            .add_transitions(transition_state.transitions.into_iter().collect());
    }

    pending.cache = std::mem::take(&mut state.cache);
    // println!("cache {:#?}", pending.cache.accounts);

    Ok(())
}

pub fn commit_to_db(
    db: &mut PersistentDB,
    pending_commit: PendingCommit,
) -> Result<Vec<AccountUpdate>, crate::db::Error> {
    let genesis_info = db.genesis_info.clone();
    let mut commit = build_commit(db, pending_commit, true)?;

    match db.commit(&mut commit) {
        Ok(_) => Ok(collect_dirty_accounts(commit, &genesis_info)),
        Err(err) => match &err {
            Error::DbFull => {
                // try to resize the db and attempt another commit on success
                db.resize().and_then(|_| {
                    db.commit(&mut commit)
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
                },
            );
        }
    }

    if let Some(info) = genesis_info {
        for receipt in commit.results.values() {
            match receipt {
                ExecutionResult::Success { logs, .. } => {
                    for log in logs {
                        match log.address {
                            _ if log.address == info.validator_contract => {
                                // Attempt to decode the log as a Voted event
                                if let Ok(event) = crate::events::Voted::decode_log(&log, true) {
                                    // println!(
                                    //     "Voted event (from={:?} to={:?})",
                                    //     event.data.voter, event.data.validator,
                                    // );

                                    dirty_accounts.get_mut(&event.voter).and_then(|account| {
                                        account.vote = Some(event.validator);
                                        account.unvote = None; // cancel out any previous unvote if one happened in same commit
                                        Some(account)
                                    });

                                    break;
                                }

                                // Attempt to decode the log as a Unvoted event
                                if let Ok(event) = crate::events::Unvoted::decode_log(&log, true) {
                                    // println!(
                                    //     "Unvoted event (from={:?} removed vote={:?})",
                                    //     event.data.voter, event.data.validator,
                                    // );

                                    dirty_accounts.get_mut(&event.voter).and_then(|account| {
                                        account.unvote = Some(event.validator);
                                        account.vote = None; // cancel out any previous vote if one happened in same commit
                                        Some(account)
                                    });

                                    break;
                                }
                            }
                            _ => (), // ignore
                        }
                    }

                    //
                }
                ExecutionResult::Revert { .. } | ExecutionResult::Halt { .. } => (),
            }
        }
    }

    dirty_accounts.into_values().collect()
}

#[test]
fn test_apply_rewards() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db = PersistentDB::new(path.path().to_path_buf()).expect("database");
    let mut pending = PendingCommit::default();

    let account1 = revm::primitives::address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
    let account2 = revm::primitives::address!("ad6f65c58a46427af4b257cbe231d0ed69ed5508");

    let mut rewards = HashMap::<Address, u128>::new();
    rewards.insert(account1, 1234);
    rewards.insert(account2, 0);

    let result = self::apply_rewards(&mut db, &mut pending, rewards);
    assert!(result.is_ok());

    assert!(pending.cache.accounts.contains_key(&account1));
    assert!(!pending.cache.accounts.contains_key(&account2));

    assert!(pending.transitions.transitions.contains_key(&account1));
    assert!(!pending.transitions.transitions.contains_key(&account2));
}
