use std::collections::HashMap;

use revm::{db::AccountStatus, primitives::B256, DatabaseRef, TransitionAccount};

use crate::{
    db::{CommitKey, Error, PendingCommit, PersistentDB},
    state_changes::{self, StateExecutionResult},
};

#[derive(Debug, Default)]
pub struct StateCommit {
    pub key: CommitKey,
    pub change_set: state_changes::StateChangeset,
    pub results: HashMap<B256, StateExecutionResult>,
}

pub fn build_commit(
    db: &mut PersistentDB,
    mut pending_commit: PendingCommit,
    is_commit_to_db: bool,
) -> Result<StateCommit, crate::db::Error> {
    merge_host_account_infos(db, &mut pending_commit, is_commit_to_db)?;

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

pub(crate) fn merge_host_account_infos(
    db: &mut PersistentDB,
    pending: &mut PendingCommit,
    take_on_commit: bool,
) -> Result<(), crate::db::Error> {
    let host = if take_on_commit {
        db.take_host_account_infos()
    } else {
        db.get_host_account_infos_cloned()
    };

    let mut transition_accounts = Vec::with_capacity(host.len());

    for (address, account) in host {
        let mut transition_account = TransitionAccount::default();
        transition_account.status = AccountStatus::Changed;
        transition_account.previous_status = AccountStatus::LoadedEmptyEIP161;

        match pending.cache.accounts.get(&address) {
            Some(cached) => {
                transition_account.info = cached.account_info().clone();
                transition_account.status = cached.status;
            }
            None => {
                // Fetch it from heed
                match db.basic_ref(address)? {
                    Some(account) => {
                        transition_account.info = Some(account);
                    }
                    None => {
                        println!("insert not-existing account");
                    }
                }
            }
        }

        // Update account in the state cache with host information
        transition_account.info.as_mut().and_then(|info| {
            // println!(
            //     "updating nonce {} {} => {}",
            //     address, info.nonce, account.nonce
            // );

            info.nonce = account.nonce;
            info.balance = account.balance;

            Some(info)
        });

        transition_accounts.push((address, transition_account));
    }

    pending.transitions.add_transitions(transition_accounts);

    Ok(())
}
