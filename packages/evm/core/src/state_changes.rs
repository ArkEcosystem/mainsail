use revm::{
    db::{states::StorageSlot, BundleState, OriginalValuesKnown},
    primitives::{AccountInfo, Address, Bytecode, B256, KECCAK_EMPTY, U256},
};

/// Loosely based on https://github.com/bluealloy/revm/blob/v36/crates/revm/src/db/states/changes.rs and https://github.com/bluealloy/revm/blob/v36/crates/revm/src/db/states/bundle_state.rs#L449
//
/// The only change being that we preserve the old storage value.
#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct StateChangeset {
    /// Vector of **not** sorted accounts information.
    pub accounts: Vec<(Address, Option<AccountInfo>)>,
    /// Vector of **not** sorted storage.
    pub storage: Vec<StorageChangeset>,
    /// Vector of contracts by bytecode hash. **not** sorted.
    pub contracts: Vec<(B256, Bytecode)>,
}

#[derive(Clone, Debug, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
pub struct StorageChangeset {
    /// Address of account
    pub address: Address,
    /// Wipe storage,
    pub wipe_storage: bool,
    /// Storage key value pairs.
    pub storage: Vec<(U256, StorageSlot)>,
}

pub struct AccountUpdate {
    pub address: Address,
    pub balance: U256,
    pub nonce: u64,
    // Set when commit receipt contains "Voted" event
    pub vote: Option<Address>,
    // Set when commit receipt contains "Unvoted" event
    pub unvote: Option<Address>,
}

pub fn bundle_into_change_set(bundle_state: BundleState) -> StateChangeset {
    let is_value_known = OriginalValuesKnown::Yes;

    let state_len = bundle_state.state.len();
    let mut accounts = Vec::with_capacity(state_len);
    let mut storage = Vec::with_capacity(state_len);

    for (address, account) in bundle_state.state {
        // append account info if it is changed.
        let was_destroyed = account.was_destroyed();
        if is_value_known.is_not_known() || account.is_info_changed() {
            let info = account.info.map(AccountInfo::without_code);
            accounts.push((address, info));
        }

        // append storage changes

        // NOTE: Assumption is that revert is going to remove whole plain storage from
        // database so we can check if plain state was wiped or not.
        let mut account_storage_changed = Vec::with_capacity(account.storage.len());

        for (key, slot) in account.storage {
            // If storage was destroyed that means that storage was wiped.
            // In that case we need to check if present storage value is different then ZERO.
            let destroyed_and_not_zero = was_destroyed && slot.present_value != U256::ZERO;

            // If account is not destroyed check if original values was changed,
            // so we can update it.
            let not_destroyed_and_changed = !was_destroyed && slot.is_changed();

            if is_value_known.is_not_known() || destroyed_and_not_zero || not_destroyed_and_changed
            {
                account_storage_changed.push((key, slot));
            }
        }

        if !account_storage_changed.is_empty() || was_destroyed {
            // append storage changes to account.
            storage.push(StorageChangeset {
                address,
                wipe_storage: was_destroyed,
                storage: account_storage_changed,
            });
        }
    }
    let contracts = bundle_state
        .contracts
        .into_iter()
        // remove empty bytecodes
        .filter(|(b, _)| *b != KECCAK_EMPTY)
        .collect::<Vec<_>>();

    StateChangeset {
        accounts,
        storage,
        contracts,
    }
}
