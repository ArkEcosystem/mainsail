use std::{
    borrow::Cow, cell::RefCell, cmp::Ordering, collections::BTreeMap, convert::Infallible,
    path::PathBuf,
};

use heed::{Comparator, EnvFlags, EnvOpenOptions};
use rayon::slice::ParallelSliceMut;
use revm::{CacheState, Database, DatabaseRef, TransitionState, primitives::*};
use serde::{Deserialize, Serialize};

use crate::{
    account::AccountInfoExtended,
    historical::{AccountHistory, HistoricalAccountData},
    legacy::{LegacyAccountAttributes, LegacyAddress, LegacyColdWallet},
    logger::{LogLevel, Logger},
    receipt::{TxReceipt, map_execution_result},
    state_changes,
    state_commit::StateCommit,
    state_hash,
};

#[derive(Debug)]
pub(crate) struct AddressWrapper(Address);
impl heed::BytesEncode<'_> for AddressWrapper {
    type EItem = AddressWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

impl heed::BytesDecode<'_> for AddressWrapper {
    type DItem = AddressWrapper;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        Ok(AddressWrapper(Address::from_slice(bytes)))
    }
}

#[derive(Debug)]
pub(crate) struct LegacyAddressWrapper(LegacyAddress);
impl heed::BytesEncode<'_> for LegacyAddressWrapper {
    type EItem = LegacyAddressWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

impl heed::BytesDecode<'_> for LegacyAddressWrapper {
    type DItem = LegacyAddressWrapper;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        Ok(LegacyAddressWrapper(LegacyAddress::from_slice(bytes)))
    }
}

#[derive(Debug)]
pub(crate) struct ContractWrapper(B256);
impl heed::BytesEncode<'_> for ContractWrapper {
    type EItem = ContractWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

type HeedHeight = heed::types::U64<heed::byteorder::BigEndian>;

#[derive(Debug)]
pub(crate) struct StorageEntryWrapper(U256, U256);
impl heed::BytesEncode<'_> for StorageEntryWrapper {
    type EItem = StorageEntryWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        let a = item.0.as_le_bytes();
        let b = item.1.as_le_bytes();

        let mut combined = Vec::with_capacity(a.len() + b.len());
        combined.extend_from_slice(a.as_ref());
        combined.extend_from_slice(b.as_ref());

        Ok(Cow::Owned(combined))
    }
}

impl heed::BytesDecode<'_> for StorageEntryWrapper {
    type DItem = StorageEntryWrapper;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        let a = U256::from_le_slice(&bytes[0..32]);
        let b = U256::from_le_slice(&bytes[32..]);
        Ok(StorageEntryWrapper(a, b))
    }
}

enum StorageEntryDupSortCmp {}

impl Comparator for StorageEntryDupSortCmp {
    fn compare(a: &[u8], b: &[u8]) -> Ordering {
        // The compared values are tuples of `StorageEntry` and sorted by the first tuple value (=32 byte)
        // which corresponds to the storage slot location. The second half of the tuple is ignored.
        a[..32].cmp(&b[..32])
    }
}

// txHash -> receipt
#[derive(Default, Debug, Serialize, Deserialize)]
pub(crate) struct CommitReceipts {
    accounts_hash: B256,
    storage_hash: B256,
    contracts_hash: B256,
    tx_receipts: HashMap<B256, TxReceipt>,
}

pub(crate) struct InnerStorage {
    pub accounts: heed::Database<AddressWrapper, heed::types::SerdeBincode<AccountInfo>>,
    pub accounts_history: Option<
        heed::Database<
            HeedHeight,
            heed::types::SerdeBincode<BTreeMap<Address, HistoricalAccountData>>,
        >,
    >,
    pub commits: heed::Database<HeedHeight, heed::types::SerdeBincode<CommitReceipts>>,
    pub contracts: heed::Database<ContractWrapper, heed::types::SerdeBincode<Bytecode>>,
    pub legacy_attributes:
        heed::Database<AddressWrapper, heed::types::SerdeBincode<LegacyAccountAttributes>>,
    pub legacy_cold_wallets:
        heed::Database<LegacyAddressWrapper, heed::types::SerdeBincode<LegacyColdWallet>>,
    pub storage: heed::Database<AddressWrapper, StorageEntryWrapper>,
}

// A (height, round) pair used to associate state with a processable unit.
#[derive(Hash, PartialEq, Eq, Debug, Default, Clone, Copy)]
pub struct CommitKey(pub u64, pub u64);

#[derive(Clone, Debug, Default)]
pub struct PendingCommit {
    pub key: CommitKey,
    pub cache: CacheState,
    pub results: BTreeMap<B256, ExecutionResult>,
    pub transitions: TransitionState,

    // Map of legacy attributes
    pub legacy_attributes: BTreeMap<Address, LegacyAccountAttributes>,

    // Map of legacy cold wallets
    pub legacy_cold_wallets: BTreeMap<LegacyAddress, LegacyColdWallet>,

    // Keeps track of all merged legacy cold wallets in this commit;
    // If an address is found in the map, then a lookup for presence of cold wallet has been performed.
    // The option indicates whether a corresponding cold wallet has been found and merged. To avoid
    // redundant lookups, any address present in the map is skipped when processing a transaction.
    pub merged_legacy_cold_wallets: BTreeMap<Address, Option<(B256, LegacyAddress)>>,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct GenesisInfo {
    pub account: Address,
    pub deployer_account: Address,
    pub validator_contract: Address,
    pub username_contract: Address,
    pub initial_height: u64,
    pub initial_supply: U256,
}

pub struct PersistentDB {
    pub(crate) env: heed::Env,
    pub(crate) inner: RefCell<InnerStorage>,
    pub(crate) accounts_history: Option<AccountHistory>,
    logger: Logger,
    pub genesis_info: Option<GenesisInfo>,
}

#[derive(Default)]
pub struct PersistentDBOptions {
    pub path: PathBuf,
    pub logger: Option<Logger>,
    pub history_size: Option<u64>,
}

impl PersistentDBOptions {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            ..Default::default()
        }
    }

    pub fn with_logger(mut self, logger: Logger) -> Self {
        self.logger.replace(logger);
        self
    }

    pub fn with_history_size(mut self, history_size: u64) -> Self {
        self.history_size.replace(history_size);
        self
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("IO error")]
    IO(#[from] std::io::Error),
    #[error("heed error")]
    Heed(#[from] heed::Error),
    #[error("db full error")]
    DbFull,
    #[error("bincode error")]
    Bincode(#[from] bincode::Error),
    #[error("infallible error")]
    Infallible(#[from] Infallible),
}

impl PersistentDB {
    pub fn new(opts: PersistentDBOptions) -> Result<Self, Error> {
        std::fs::create_dir_all(&opts.path)?;

        let mut env_builder = EnvOpenOptions::new();

        let mut max_dbs = 6;
        if opts.history_size.is_some() {
            max_dbs += 1;
        }

        env_builder.max_dbs(max_dbs);
        env_builder.map_size(1 * MAP_SIZE_UNIT);
        unsafe { env_builder.flags(EnvFlags::NO_SUB_DIR) };

        let env = unsafe { env_builder.open(opts.path.join("evm.mdb")) }?;

        Self::new_with_env(env, opts)
    }

    pub fn new_with_env(env: heed::Env, opts: PersistentDBOptions) -> Result<Self, Error> {
        let real_disk_size = env.real_disk_size()?;
        if real_disk_size >= env.info().map_size as u64 {
            // ensure initial map size is always larger than disk size
            unsafe { env.resize(next_map_size(real_disk_size as usize))? };
        }

        let tx_env = env.clone();
        let mut wtxn = tx_env.write_txn()?;

        let accounts = env
            .create_database::<AddressWrapper, heed::types::SerdeBincode<AccountInfo>>(
                &mut wtxn,
                Some("accounts"),
            )?;

        let (accounts_history_db, accounts_history) = match opts.history_size {
            Some(history_size) if history_size > 0 => {
                let db = env.create_database::<HeedHeight, heed::types::SerdeBincode<
            BTreeMap<Address, HistoricalAccountData>>>(&mut wtxn, Some("accounts_history")) ?;
                (Some(db), Some(AccountHistory::new(history_size)))
            }
            _ => (None, None),
        };

        let commits = env
            .create_database::<HeedHeight, heed::types::SerdeBincode<CommitReceipts>>(
                &mut wtxn,
                Some("commits"),
            )?;
        let contracts = env
            .create_database::<ContractWrapper, heed::types::SerdeBincode<Bytecode>>(
                &mut wtxn,
                Some("contracts"),
            )?;
        let legacy_attributes = env
            .create_database::<AddressWrapper, heed::types::SerdeBincode<LegacyAccountAttributes>>(
                &mut wtxn,
                Some("legacy_attributes"),
            )?;
        let legacy_cold_wallets = env
            .create_database::<LegacyAddressWrapper, heed::types::SerdeBincode<LegacyColdWallet>>(
                &mut wtxn,
                Some("legacy_cold_wallets"),
            )?;
        let storage = env
            .database_options()
            .types::<AddressWrapper, StorageEntryWrapper>()
            .name("storage")
            .flags(heed::DatabaseFlags::DUP_SORT)
            .dup_sort_comparator::<StorageEntryDupSortCmp>()
            .create(&mut wtxn)?;

        wtxn.commit()?;

        Ok(Self {
            env,
            inner: RefCell::new(InnerStorage {
                accounts,
                accounts_history: accounts_history_db,
                commits,
                contracts,
                legacy_attributes,
                legacy_cold_wallets,
                storage,
            }),
            accounts_history,
            logger: opts.logger.unwrap_or_default(),
            genesis_info: None,
        })
    }

    pub fn set_genesis_info(&mut self, genesis_info: GenesisInfo) {
        self.genesis_info.replace(genesis_info);
    }

    pub fn get_accounts(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<AccountInfoExtended>), Error> {
        let tx_env = self.env.read_txn()?;
        let iter = self
            .inner
            .borrow()
            .accounts
            .iter(&tx_env)?
            .skip(offset as usize);

        let (cursor, mut accounts) = self.get_items(
            iter,
            |item| match item {
                Some(item) => {
                    let (address, info) = item?;
                    Ok(Some(AccountInfoExtended {
                        address: address.0,
                        info: AccountInfo {
                            balance: info.balance,
                            nonce: info.nonce,
                            ..Default::default()
                        },
                        ..Default::default()
                    }))
                }
                None => Ok(None),
            },
            offset,
            limit,
        )?;

        for account in accounts.iter_mut() {
            if let Some(legacy_attributes) = self
                .inner
                .borrow()
                .legacy_attributes
                .get(&tx_env, &AddressWrapper(account.address))?
            {
                account.legacy_attributes = legacy_attributes;
            }
        }

        Ok((cursor, accounts))
    }

    pub fn get_legacy_cold_wallets(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<LegacyColdWallet>), Error> {
        let tx_env = self.env.read_txn()?;
        let iter = self
            .inner
            .borrow()
            .legacy_cold_wallets
            .iter(&tx_env)?
            .skip(offset as usize);

        self.get_items(
            iter,
            |item| match item {
                Some(item) => {
                    let (_, legacy_cold_wallet) = item?;
                    Ok(Some(legacy_cold_wallet))
                }
                None => Ok(None),
            },
            offset,
            limit,
        )
    }

    pub fn get_receipts(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<(u64, Vec<(B256, TxReceipt)>)>), Error> {
        let tx_env = self.env.read_txn()?;
        let iter = self
            .inner
            .borrow()
            .commits
            .iter(&tx_env)?
            .skip(offset as usize);

        self.get_items(
            iter,
            |item| match item {
                Some(item) => {
                    let (height, CommitReceipts { tx_receipts, .. }) = item?;
                    Ok(Some((height, tx_receipts.into_iter().collect())))
                }
                None => Ok(None),
            },
            offset,
            limit,
        )
    }

    pub fn get_receipt(&self, height: u64, tx_hash: B256) -> Result<Option<TxReceipt>, Error> {
        let tx_env = self.env.read_txn()?;

        let commits = self.inner.borrow().commits.get(&tx_env, &height)?;

        Ok(match commits {
            Some(inner) => inner.tx_receipts.get(&tx_hash).cloned(),
            None => None,
        })
    }

    pub fn get_historical_account_info(
        &mut self,
        height: u64,
        address: Address,
    ) -> Result<Option<AccountInfo>, Error> {
        match self.inner.borrow().accounts_history {
            Some(db) => {
                let tx_env = self.env.read_txn()?;

                match self.accounts_history.as_ref() {
                    Some(accounts_history) => {
                        let data = accounts_history
                            .get_by_block_and_address(&tx_env, &db, height, &address)?;

                        match data {
                            Some(data) => Ok(Some(AccountInfo {
                                balance: data.balance,
                                nonce: data.nonce,
                                code_hash: data.code_hash,
                                ..Default::default()
                            })),
                            None => Ok(None),
                        }
                    }
                    None => Ok(None),
                }
            }
            None => Ok(None),
        }
    }

    pub fn get_legacy_attributes(
        &mut self,
        address: Address,
    ) -> Result<Option<LegacyAccountAttributes>, Error> {
        let tx_env = self.env.read_txn()?;
        Ok(self
            .inner
            .borrow()
            .legacy_attributes
            .get(&tx_env, &AddressWrapper(address))?)
    }

    pub fn get_legacy_cold_wallet(
        &mut self,
        address: LegacyAddress,
    ) -> Result<Option<LegacyColdWallet>, Error> {
        let tx_env = self.env.read_txn()?;
        Ok(self
            .inner
            .borrow()
            .legacy_cold_wallets
            .get(&tx_env, &LegacyAddressWrapper(address))?)
    }

    pub fn resize(&self) -> Result<(), Error> {
        let info = self.env.info();

        let current_map_size = info.map_size;

        let next_map_size = next_map_size(current_map_size);

        self.logger.log(
            LogLevel::Info,
            format!("resizing db {} -> {}", current_map_size, next_map_size),
        );

        unsafe { self.env.resize(next_map_size)? };

        Ok(())
    }

    fn get_items<T, I, F>(
        &self,
        mut iter: impl Iterator<Item = I>,
        map: F,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<T>), Error>
    where
        F: Fn(Option<I>) -> Result<Option<T>, Error>,
    {
        let limit = limit as usize;
        let mut items = Vec::with_capacity(limit);

        loop {
            let item = map(iter.next())?;
            let Some(item) = item else {
                break;
            };

            items.push(item);

            if items.len() == limit {
                break;
            }
        }

        let next = if items.len() == limit {
            // return next offset as there might be more to read
            Some(offset + items.len() as u64)
        } else {
            None
        };

        Ok((next, items))
    }
}

const MAP_SIZE_UNIT: usize = 1024 * 1024 * 1024; // 1 GB
fn next_map_size(map_size: usize) -> usize {
    map_size / MAP_SIZE_UNIT * MAP_SIZE_UNIT + MAP_SIZE_UNIT
}

impl Database for PersistentDB {
    type Error = Error;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        <Self as DatabaseRef>::basic_ref(self, address)
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        <Self as DatabaseRef>::code_by_hash_ref(self, code_hash)
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        <Self as DatabaseRef>::storage_ref(self, address, index)
    }

    fn block_hash(&mut self, number: u64) -> Result<B256, Self::Error> {
        <Self as DatabaseRef>::block_hash_ref(self, number)
    }
}

impl DatabaseRef for PersistentDB {
    type Error = Error;

    fn basic_ref(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let txn = self.env.read_txn()?;
        let inner = self.inner.borrow();

        let basic = match inner.accounts.get(&txn, &AddressWrapper(address))? {
            Some(account) => account,
            None => match &self.genesis_info {
                Some(genesis) if genesis.account == address => revm::primitives::AccountInfo {
                    balance: genesis.initial_supply,
                    ..Default::default()
                },
                _ => AccountInfo::default(),
            },
        };

        Ok(basic.into())
    }

    fn code_by_hash_ref(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        let txn = self.env.read_txn()?;
        let inner = self.inner.borrow();

        let contract = match inner.contracts.get(&txn, &ContractWrapper(code_hash))? {
            Some(contract) => contract,
            None => Default::default(),
        };

        Ok(contract)
    }

    fn storage_ref(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        let txn = self.env.read_txn()?;
        let inner = self.inner.borrow_mut();

        let mut iter = inner.storage.iter(&txn)?;
        let location = &StorageEntryWrapper(index, U256::ZERO);

        match iter.move_on_key_dup(&AddressWrapper(address), &location)? {
            Some((_, value)) if value.0 == location.0 => Ok(value.1),
            _ => Ok(U256::ZERO),
        }
    }

    fn block_hash_ref(&self, _number: u64) -> Result<B256, Self::Error> {
        todo!()
    }
}

impl PersistentDB {
    pub fn commit(&self, state_commit: &mut StateCommit) -> Result<(), Error> {
        let StateCommit {
            key,
            change_set,
            results,
        } = state_commit;

        match self.commit_to_db(*key, change_set, results) {
            Ok(_) => return Ok(()),
            Err(err) => match &err {
                Error::Heed(heed_err) => match heed_err {
                    heed::Error::Mdb(mdb_err) => match mdb_err {
                        heed::MdbError::MapFull => return Err(Error::DbFull),
                        _ => return Err(err),
                    },
                    _ => return Err(err),
                },
                _ => return Err(err),
            },
        }
    }

    fn commit_to_db(
        &self,
        key: CommitKey,
        change_set: &mut state_changes::StateChangeset,
        results: &BTreeMap<B256, ExecutionResult>,
    ) -> Result<(), Error> {
        assert!(!self.is_height_committed(key.0));

        let mut rwtxn = self.env.write_txn()?;
        let inner = self.inner.borrow_mut();

        let mut apply_changes = |rwtxn: &mut heed::RwTxn| -> Result<(), Error> {
            let state_changes::StateChangeset {
                accounts,
                storage,
                contracts,
                legacy_attributes,
                legacy_cold_wallets,
                merged_legacy_cold_wallets,
            } = change_set;

            accounts.par_sort_by_key(|a| a.0);
            contracts.par_sort_by_key(|a| a.0);
            storage.par_sort_by_key(|a| a.address);

            // Update accounts
            for (address, account) in accounts.iter() {
                let address = AddressWrapper(*address);

                if let Some(account) = account {
                    inner.accounts.put(rwtxn, &address, &account)?;
                } else {
                    inner.accounts.delete(rwtxn, &address)?;
                }
            }

            // Update account history
            if let Some(db) = &inner.accounts_history {
                self.accounts_history
                    .as_ref()
                    .expect("accounts history")
                    .insert(
                        rwtxn,
                        db,
                        key.0,
                        accounts
                            .iter()
                            .map(|a| (a.0, a.1.clone().unwrap_or_default()))
                            .collect(),
                    )?;
            }

            // Update legacy attributes
            for (address, legacy_attributes) in legacy_attributes.into_iter() {
                let address = AddressWrapper(*address);
                inner
                    .legacy_attributes
                    .put(rwtxn, &address, legacy_attributes)?;
            }

            // Update legacy cold wallets
            for (address, legacy_cold_wallets) in legacy_cold_wallets.into_iter() {
                let address = LegacyAddressWrapper(*address);
                inner
                    .legacy_cold_wallets
                    .put(rwtxn, &address, legacy_cold_wallets)?;
            }

            // Update contracts
            for (hash, bytecode) in contracts.into_iter() {
                inner
                    .contracts
                    .put(rwtxn, &ContractWrapper(*hash), &bytecode)?;
            }

            // Update storage
            for state_changes::StorageChangeset {
                address,
                wipe_storage,
                storage,
            } in storage.into_iter()
            {
                let mut iter = inner.storage.iter_mut(rwtxn)?;
                let address = AddressWrapper(*address);

                if iter.move_on_key(&address)? {
                    if *wipe_storage {
                        // wipe all existing storage for address
                        unsafe { iter.del_current_with_flags(heed::DeleteFlags::NO_DUP_DATA)? };
                    }
                }

                storage.par_sort_unstable_by_key(|a| a.0);

                for value in storage.into_iter() {
                    let new_storage_value = &StorageEntryWrapper(value.0, value.1.present_value());

                    if let Some((_, iter_value)) =
                        iter.move_on_key_dup(&address, &new_storage_value)?
                    {
                        // overwrite or delete if key matches
                        if iter_value.0 == value.0 {
                            if value.1.present_value().is_zero() {
                                let success = unsafe { iter.del_current()? };
                                assert!(success);
                            } else if value.1.present_value() != iter_value.1 {
                                unsafe {
                                    // overwrite current position of cursor
                                    let success = iter.put_current(&address, &new_storage_value)?;
                                    assert!(success);
                                }
                            } else {
                                // skip unchanged storage
                            }

                            // cursor matched existing entry, move on to next
                            continue;
                        }
                    }

                    if value.1.present_value() != U256::ZERO {
                        unsafe {
                            iter.put_current_with_options(
                                heed::PutFlags::NO_DUP_DATA,
                                &address,
                                &new_storage_value,
                            )?;
                        }
                    }
                }
            }

            // Mark legacy cold wallets as merged in storage and migrate legacy attributes
            for (address, legacy) in merged_legacy_cold_wallets {
                self.logger.log(
                    LogLevel::Info,
                    format!(
                        "Merging legacy cold wallet '{}' with '{}'",
                        legacy.1, address
                    ),
                );

                let key = &LegacyAddressWrapper(legacy.1);
                let mut legacy_cold_wallet = inner
                    .legacy_cold_wallets
                    .get(&rwtxn, key)?
                    .expect("legacy cold wallet to be found");

                assert!(legacy_cold_wallet.merge_info.is_none());
                legacy_cold_wallet.merge_info.replace((legacy.0, *address));

                inner
                    .legacy_cold_wallets
                    .put(rwtxn, key, &legacy_cold_wallet)?;

                // The legacy balance has already been applied to the `PendingCommit`,
                // thus only the legacy attributes need to be moved to a different storage.
                inner.legacy_attributes.put(
                    rwtxn,
                    &AddressWrapper(*address),
                    &legacy_cold_wallet.legacy_attributes,
                )?;
            }

            // Finalize commit
            let mut tx_receipts = HashMap::new();
            for (k, result) in results {
                tx_receipts.insert(k.clone(), map_execution_result(result.clone()));
            }

            inner.commits.put(
                rwtxn,
                &key.0,
                &CommitReceipts {
                    accounts_hash: state_hash::calculate_accounts_hash(&change_set)?,
                    contracts_hash: state_hash::calculate_contracts_hash(&change_set)?,
                    storage_hash: state_hash::calculate_storage_hash(&change_set)?,
                    tx_receipts,
                },
            )?;

            Ok(())
        };

        if let Err(err) = apply_changes(&mut rwtxn) {
            rwtxn.abort();
            return Err(err.into());
        }

        rwtxn.commit()?;

        Ok(())
    }

    pub fn is_height_committed(&self, height: u64) -> bool {
        let env = self.env.clone();
        let rtxn = env.read_txn().expect("read");
        let inner = self.inner.borrow();

        inner.commits.get(&rtxn, &height).is_ok_and(|v| v.is_some())
    }

    pub fn get_committed_receipt(
        &self,
        height: u64,
        tx_hash: B256,
    ) -> Result<(bool, Option<TxReceipt>), Error> {
        let env = self.env.clone();
        let rtxn = env.read_txn().expect("read");
        let inner = self.inner.borrow();

        match inner.commits.get(&rtxn, &height)? {
            Some(receipts) => Ok((true, receipts.tx_receipts.get(&tx_hash).cloned())),
            None => Ok((false, None)),
        }
    }

    pub fn get_committed_hashes(&self, height: u64) -> Result<Option<(B256, B256, B256)>, Error> {
        let env = self.env.clone();
        let rtxn = env.read_txn().expect("read");
        let inner = self.inner.borrow();

        match inner.commits.get(&rtxn, &height)? {
            Some(receipts) => Ok(Some((
                receipts.accounts_hash,
                receipts.contracts_hash,
                receipts.storage_hash,
            ))),
            None => Ok(None),
        }
    }
}

impl PendingCommit {
    pub fn new(key: CommitKey) -> Self {
        Self {
            key,
            cache: Default::default(),
            results: Default::default(),
            transitions: Default::default(),
            legacy_attributes: Default::default(),
            legacy_cold_wallets: Default::default(),
            merged_legacy_cold_wallets: Default::default(),
        }
    }

    pub fn import_account(
        &mut self,
        address: Address,
        info: AccountInfo,
        legacy_attributes: Option<LegacyAccountAttributes>,
    ) {
        let mut state = revm::State::builder()
            .with_bundle_update()
            .with_cached_prestate(std::mem::take(&mut self.cache))
            .build();

        state
            .increment_balances(
                vec![(address, info.balance.try_into().expect("fit u128"))]
                    .into_iter()
                    .collect::<HashMap<Address, u128>>(),
            )
            .expect("import account balance");

        if let Some(transition_state) = state.transition_state.take() {
            self.transitions
                .add_transitions(transition_state.transitions.into_iter().collect());
        }

        self.cache = std::mem::take(&mut state.cache);

        if let Some(legacy_attributes) = legacy_attributes {
            self.legacy_attributes.insert(address, legacy_attributes);
        }
    }
}

#[test]
fn test_open_db() {
    let tmp = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    assert!(PersistentDB::new(PersistentDBOptions::new(tmp.path().to_path_buf())).is_ok());
}

#[test]
fn test_commit_changes() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db =
        PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("database");

    // 1) Lookup empty account
    let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
    let account = db.basic(address).expect("works").expect("account info");

    assert_eq!(
        account.code_hash,
        FixedBytes(hex!(
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        ))
    );

    // 2) Update balance for account
    let mut state = HashMap::new();

    let mut account = Account::new_not_existing();
    account.info.balance = U256::from(100);
    account.status = AccountStatus::Touched;

    let code = Bytecode::new();
    account.info.code_hash = code.hash_slow();
    account.info.code = Some(code.clone());

    let mut storage = HashMap::new();
    storage.insert(
        U256::from(1),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(1234)),
    );
    storage.insert(
        U256::from(2),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(5678)),
    );

    state.insert(
        address,
        revm::db::TransitionAccount {
            status: revm::db::AccountStatus::InMemoryChange,
            info: Some(account.info.clone()),
            previous_status: revm::db::AccountStatus::Loaded,
            previous_info: None,
            storage,
            storage_was_destroyed: false,
        },
    );

    crate::state_commit::commit_to_db(
        &mut db,
        PendingCommit {
            key: CommitKey(0, 0),
            transitions: TransitionState { transitions: state },
            ..Default::default()
        },
    )
    .expect("ok");

    // 3) Assert updated storage

    // Balance
    let account = db.basic(address).expect("works").expect("account info");
    assert_eq!(account.balance, U256::from(100));

    // Code
    assert_eq!(account.code_hash, code.hash_slow());
    let account_code = db.code_by_hash(code.hash_slow()).expect("code");
    assert_eq!(account_code, code);

    // Storage
    let mut account_storage = db.storage(address, U256::from(1)).expect("storage");
    assert_eq!(account_storage, U256::from(1234));

    account_storage = db.storage(address, U256::from(2)).expect("storage");
    assert_eq!(account_storage, U256::from(5678));
}

#[test]
fn test_storage() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db =
        PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("database");

    let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
    let mut state = HashMap::new();

    let mut account = Account::new_not_existing();
    account.status = AccountStatus::Touched;

    let mut storage = HashMap::new();

    storage.insert(
        U256::from(99),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(99)),
    );
    storage.insert(
        U256::from(1),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
    );
    storage.insert(
        U256::from(101),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(101)),
    );
    storage.insert(
        U256::from(2),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(2)),
    );
    storage.insert(
        U256::from(4),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(4)),
    );

    state.insert(
        address,
        revm::db::TransitionAccount {
            status: revm::db::AccountStatus::InMemoryChange,
            info: Some(account.info.clone()),
            previous_status: revm::db::AccountStatus::Loaded,
            previous_info: None,
            storage,
            storage_was_destroyed: false,
        },
    );

    crate::state_commit::commit_to_db(
        &mut db,
        PendingCommit {
            key: CommitKey(0, 0),
            transitions: TransitionState { transitions: state },
            ..Default::default()
        },
    )
    .expect("ok");

    // Assert storage is sorted

    let indexes = vec![1, 2, 4, 99, 101];

    // Storage
    for index in indexes {
        let account_storage = db.storage(address, U256::from(index)).expect("storage");
        assert_eq!(account_storage, U256::from(index));
    }
}

#[test]
fn test_storage_overwrite() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db =
        PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("database");

    let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
    let mut state = HashMap::new();

    let mut account = Account::new_not_existing();
    account.status = AccountStatus::Touched;

    let mut storage = HashMap::new();

    storage.insert(
        U256::from(1),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
    );
    storage.insert(
        U256::from(2),
        revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(2)),
    );

    state.insert(
        address,
        revm::db::TransitionAccount {
            status: revm::db::AccountStatus::InMemoryChange,
            info: Some(account.info.clone()),
            previous_status: revm::db::AccountStatus::Loaded,
            previous_info: None,
            storage,
            storage_was_destroyed: false,
        },
    );

    crate::state_commit::commit_to_db(
        &mut db,
        PendingCommit {
            key: CommitKey(0, 0),
            transitions: TransitionState { transitions: state },
            ..Default::default()
        },
    )
    .expect("ok");

    // Assert storage
    let mut account_storage = db.storage(address, U256::from(1)).expect("storage");
    assert_eq!(account_storage, U256::from(1));
    account_storage = db.storage(address, U256::from(2)).expect("storage");
    assert_eq!(account_storage, U256::from(2));

    // Now overwrite index 1
    let mut storage = HashMap::new();
    storage.insert(
        U256::from(1),
        revm::db::states::StorageSlot::new_changed(U256::from(1), U256::from(99)),
    );

    let mut state = HashMap::new();
    state.insert(
        address,
        revm::db::TransitionAccount {
            status: revm::db::AccountStatus::Changed,
            info: Some(account.info.clone()),
            previous_status: revm::db::AccountStatus::Loaded,
            previous_info: None,
            storage,
            storage_was_destroyed: false,
        },
    );

    crate::state_commit::commit_to_db(
        &mut db,
        PendingCommit {
            key: CommitKey(1, 0),
            transitions: TransitionState { transitions: state },
            ..Default::default()
        },
    )
    .expect("ok");

    // Assert storage again

    // - index 1 was overwritte
    let mut account_storage = db.storage(address, U256::from(1)).expect("storage");
    assert_eq!(account_storage, U256::from(99));

    // - index 2 remains unchanged
    account_storage = db.storage(address, U256::from(2)).expect("storage");
    assert_eq!(account_storage, U256::from(2));
}

#[test]
fn test_next_map_size() {
    let input = vec![0, 1, 2, 3, 4];
    for i in input {
        let next = next_map_size(i * MAP_SIZE_UNIT);
        assert_eq!(next, (i + 1) * MAP_SIZE_UNIT);
    }
}

#[test]
fn test_resize_on_commit() {
    let create_large_commit = |height: u64, n: usize| {
        let mut buf = vec![0; 32];
        buf[0..8].copy_from_slice(&height.to_le_bytes());
        let address = Address::from_word(ethers_core::utils::keccak256(buf).into());

        let mut state = HashMap::new();

        let mut account = Account::new_not_existing();
        account.status = AccountStatus::Touched;

        let mut storage = HashMap::new();

        for i in 0..n {
            storage.insert(
                U256::from(i + 1),
                revm::db::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
            );
        }

        state.insert(
            address,
            revm::db::TransitionAccount {
                status: revm::db::AccountStatus::InMemoryChange,
                info: Some(account.info.clone()),
                previous_status: revm::db::AccountStatus::Loaded,
                previous_info: None,
                storage,
                storage_was_destroyed: false,
            },
        );

        PendingCommit {
            key: CommitKey(height, 0),
            transitions: TransitionState { transitions: state },
            ..Default::default()
        }
    };

    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut env_builder = EnvOpenOptions::new();
    env_builder.max_dbs(6);
    env_builder.map_size(4096 * 10); // start with very small (few kB)

    unsafe { env_builder.flags(EnvFlags::NO_SUB_DIR) };

    let env = unsafe { env_builder.open(path.path().join("evm.mdb")) }.expect("ok");

    let mut db = PersistentDB::new_with_env(env, Default::default()).expect("open");
    assert_eq!(db.env.info().map_size, 4096 * 10);

    // large commit to trigger a resize
    crate::state_commit::commit_to_db(&mut db, create_large_commit(0, 1024)).expect("ok");

    // increased to next MAP_SIZE_UNIT
    assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);

    // add more commits without triggering another resize
    for i in 0..10 {
        crate::state_commit::commit_to_db(&mut db, create_large_commit(i + 1, 1024)).expect("ok");
        assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);
    }

    // reopen db with initial env size should automatically resize
    drop(db);

    let env = unsafe { env_builder.open(path.path().join("evm.mdb")) }.expect("ok");
    let db = PersistentDB::new_with_env(env, Default::default()).expect("open");
    assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);
}

#[test]
fn test_read_accounts() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let db =
        PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("database");

    let addresses = [
        address!("27b1fdb04752bbc536007a920d24acb045561c26"),
        address!("3599689E6292b81B2d85451025146515070129Bb"),
        address!("42712D45473476b98452f434e72461577D686318"),
        address!("52908400098527886E0F7030069857D2E4169EE7"),
        address!("5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"),
        address!("6549f4939460DE12611948b3f82b88C3C8975323"),
        address!("66f9664f97F2b50F62D13eA064982f936dE76657"),
        address!("8617E340B3D01FA5F11F306F4090FD50E238070D"),
        address!("88021160C5C792225E4E5452585947470010289D"),
        address!("D1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb"),
        address!("dbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB"),
        address!("de709f2102306220921060314715629080e2fb77"),
        address!("fB6916095ca1df60bB79Ce92cE3Ea74c37c5d359"),
    ];

    {
        let mut wtxn = db.env.write_txn().unwrap();

        for (index, address) in addresses.iter().enumerate() {
            db.inner
                .borrow_mut()
                .accounts
                .put(
                    &mut wtxn,
                    &AddressWrapper(*address),
                    &AccountInfo {
                        balance: U256::from(index),
                        nonce: index as u64,
                        ..Default::default()
                    },
                )
                .unwrap();
        }
        wtxn.commit().unwrap();
    }

    const LIMIT: u64 = 5;
    let mut offset = 0;

    let mut read = 0;

    loop {
        let (next, accounts) = db.get_accounts(offset, LIMIT).unwrap();
        for account in accounts {
            println!("{:?}", account);
            read += 1;
        }

        if next.is_none() {
            break;
        }

        match next {
            Some(next) => {
                offset = next;
            }
            None => {
                break;
            }
        }
    }

    assert_eq!(read, addresses.len());
}

#[test]
fn test_read_receipts() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let db =
        PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("database");

    let target_height = 100;
    let mut total_receipts = 0;

    {
        let mut wtxn = db.env.write_txn().unwrap();

        fn random_b256(seed: u64, offset: u64) -> B256 {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            seed.hash(&mut hasher);

            B256::from(U256::from(hasher.finish() + offset))
        }

        for i in 0..target_height {
            let height = (i + 1) as u64;

            let receipts: HashMap<B256, TxReceipt> = HashMap::from([
                (random_b256(height, 0), TxReceipt::default()),
                (random_b256(height, 1), TxReceipt::default()),
                (random_b256(height, 2), TxReceipt::default()),
                (random_b256(height, 3), TxReceipt::default()),
            ]);

            total_receipts += receipts.len();

            db.inner
                .borrow_mut()
                .commits
                .put(
                    &mut wtxn,
                    &height,
                    &CommitReceipts {
                        tx_receipts: receipts,
                        ..Default::default()
                    },
                )
                .unwrap();
        }
        wtxn.commit().unwrap();
    }

    const LIMIT: u64 = 7;
    let mut offset = 0;

    let mut read_height = 0;
    let mut read_receipts = 0;

    loop {
        let (next, items) = db.get_receipts(offset, LIMIT).unwrap();
        for (height, receipts) in items {
            read_height = height;
            read_receipts += receipts.len();
        }

        if next.is_none() {
            break;
        }

        match next {
            Some(next) => {
                offset = next;
            }
            None => {
                break;
            }
        }
    }

    assert_eq!(read_height, target_height);
    assert_eq!(read_receipts, total_receipts);
}
