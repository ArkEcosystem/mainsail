use std::collections::HashMap;

use revm::{
    db::AccountStatus,
    primitives::{ExecutionResult, B256},
    DatabaseRef, TransitionAccount,
};

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
    db: &mut PersistentDB,
    mut pending_commit: PendingCommit,
) -> Result<(), crate::db::Error> {
    merge_native_account_infos(db, &mut pending_commit)?;

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

fn merge_native_account_infos(
    db: &mut PersistentDB,
    pending: &mut PendingCommit,
) -> Result<(), crate::db::Error> {
    let native = db.take_native_account_infos();
    // TODO: here we could potentially also check for native balance changes caused by contracts
    // and pass it back to the main process.

    let mut transition_accounts = Vec::with_capacity(native.len());

    for (address, account) in native {
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

        // Update account in the state cache with native information
        transition_account.info.as_mut().and_then(|info| {
            // println!(
            //     "updating nonce {} {} => {}",
            //     address, info.nonce, account.nonce
            // );

            info.nonce = account.nonce;
            Some(info)
        });

        transition_accounts.push((address, transition_account));
    }

    pending.transitions.add_transitions(transition_accounts);

    Ok(())
}
