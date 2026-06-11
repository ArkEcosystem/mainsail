use std::{
    borrow::Cow,
    cell::RefCell,
    cmp::Ordering,
    collections::BTreeMap,
    convert::Infallible,
    path::PathBuf,
    sync::{Arc, LazyLock, RwLock, RwLockReadGuard},
};

use alloy_primitives::Bloom;
use heed::{Comparator, EnvFlags, EnvOpenOptions};
use revm::{
    Database, DatabaseRef,
    context::{DBErrorMarker, result::ExecutionResult},
    database::{CacheState, TransitionAccount, TransitionState},
    primitives::*,
    state::{AccountInfo, Bytecode},
};
use serde::{Deserialize, Serialize};

use crate::{
    account::{AccountInfoExtended, StoredAccountInfo},
    bytecode::StoredBytecode,
    compression::CompactBincode,
    historical::{AccountHistory, HistoricalAccountData},
    legacy::{LegacyAccountAttributes, LegacyAddress, LegacyColdWallet},
    logger::{LogLevel, Logger},
    receipt::{TxReceipt, map_execution_result},
    state_changes,
    state_commit::StateCommit,
};

#[derive(Debug)]
pub(crate) struct AddressWrapper(Address);
impl heed::BytesEncode<'_> for AddressWrapper {
    type EItem = AddressWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
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

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
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
pub(crate) struct HashWrapper(B256);
impl heed::BytesEncode<'_> for HashWrapper {
    type EItem = HashWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TransactionKey {
    pub block_number: u64,
    pub index: u16,
}

impl TransactionKey {
    pub fn new(block_number: u64, index: u16) -> Self {
        Self {
            block_number,
            index,
        }
    }

    // Parses the "<block_number>-<index>" token exchanged across the napi boundary.
    pub fn parse(token: &str) -> Option<Self> {
        let (block_number, index) = token.split_once('-')?;
        Some(Self {
            block_number: block_number.parse().ok()?,
            index: index.parse().ok()?,
        })
    }

    pub fn to_token(&self) -> String {
        format!("{}-{}", self.block_number, self.index)
    }
}

impl heed::BytesEncode<'_> for TransactionKey {
    type EItem = TransactionKey;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
        let mut buffer = Vec::with_capacity(10);
        buffer.extend_from_slice(&item.block_number.to_be_bytes());
        buffer.extend_from_slice(&item.index.to_be_bytes());
        Ok(Cow::Owned(buffer))
    }
}

impl heed::BytesDecode<'_> for TransactionKey {
    type DItem = TransactionKey;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        let Some((block_number, rest)) = bytes.split_first_chunk::<8>() else {
            return Err("TransactionKey: truncated key".into());
        };
        let Some((index, _)) = rest.split_first_chunk::<2>() else {
            return Err("TransactionKey: truncated key".into());
        };

        Ok(TransactionKey {
            block_number: u64::from_be_bytes(*block_number),
            index: u16::from_be_bytes(*index),
        })
    }
}

#[derive(Debug)]
pub(crate) struct StaticStringWrapper(&'static str);
impl heed::BytesEncode<'_> for StaticStringWrapper {
    type EItem = StaticStringWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_bytes()))
    }
}

type HeedBlockNumber = heed::types::U64<heed::byteorder::BigEndian>;

#[derive(Debug)]
pub(crate) struct StorageEntryWrapper(U256, U256);
impl heed::BytesEncode<'_> for StorageEntryWrapper {
    type EItem = StorageEntryWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<'_, [u8]>, heed::BoxedError> {
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

pub enum StorageEntryDupSortCmp {}

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
    tx_receipts: HashMap<B256, TxReceipt>,
}

pub(crate) struct InnerStorage {
    pub accounts: heed::Database<AddressWrapper, CompactBincode<StoredAccountInfo>>,
    pub accounts_history: Option<
        heed::Database<HeedBlockNumber, CompactBincode<BTreeMap<Address, HistoricalAccountData>>>,
    >,
    pub commits: heed::Database<HeedBlockNumber, CompactBincode<CommitReceipts>>,
    pub contracts: heed::Database<HashWrapper, CompactBincode<StoredBytecode>>,
    pub legacy_attributes: heed::Database<AddressWrapper, CompactBincode<LegacyAccountAttributes>>,
    pub legacy_cold_wallets: heed::Database<LegacyAddressWrapper, CompactBincode<LegacyColdWallet>>,
    pub storage: heed::Database<
        AddressWrapper,
        StorageEntryWrapper,
        heed::DefaultComparator,
        StorageEntryDupSortCmp,
    >,
    // Carried over from previous database-service.ts lmdb backend
    pub state: heed::Database<StaticStringWrapper, heed::types::SerdeBincode<Bytes>>,
    pub proofs: heed::Database<HeedBlockNumber, CompactBincode<ProofData>>,
    pub blocks: heed::Database<HeedBlockNumber, CompactBincode<BlockHeaderData>>,
    pub blocks_hash_number: heed::Database<HashWrapper, HeedBlockNumber>,
    pub transactions: heed::Database<TransactionKey, CompactBincode<TransactionData>>,
    pub transactions_hash_key: heed::Database<HashWrapper, TransactionKey>,
    //
}

// A key of (block_number, round, block_hash) used to associate state with a processable unit.
#[derive(Hash, PartialEq, Eq, Debug, Default, Clone, Copy)]
pub struct CommitKey(pub u64, pub u64, pub B256);

pub type BlsSig = revm::primitives::FixedBytes<96>;

#[derive(Default, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ProofData {
    pub round: u32,
    pub signature: BlsSig,
    pub validator_set: u128,
}

#[derive(Default, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct BlockHeaderData {
    pub version: u8,
    pub timestamp: u64,
    pub number: u32,
    pub round: u32,
    pub hash: B256,
    pub parent_hash: B256,
    pub state_root: B256,
    pub logs_bloom: Bloom,
    pub transactions_root: B256,
    pub transactions_count: u16,
    pub gas_used: u32,
    pub fee: U256,
    pub reward: U256,
    pub payload_size: u32,
    pub proposer: Address,
}

#[derive(Default, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TransactionData {
    pub from: Address,
    pub sender_public_key: String,
    pub legacy_address: Option<LegacyAddress>,
    pub to: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: u128,
    pub value: U256,
    pub nonce: u64,
    pub data: Bytes,
    pub v: u32,
    pub r: U256,
    pub s: U256,
    pub legacy_second_signature: Option<String>,
    pub tx_hash: B256,
    pub block_number: u32,
    pub index: u32,
}

#[derive(Default, PartialEq, Eq)]
pub struct CommitData {
    pub proof: ProofData,
    pub header: BlockHeaderData,
    pub transactions: Vec<TransactionData>,
}

#[derive(Clone, Debug, Default)]
pub struct PendingCommit {
    pub key: CommitKey,
    pub cache: CacheState,
    pub results: BTreeMap<B256, (ExecutionResult, u64)>,
    pub transitions: TransitionState,

    pub cumulative_gas_used: u64,

    // Map of legacy attributes
    pub legacy_attributes: BTreeMap<Address, LegacyAccountAttributes>,

    // Map of legacy cold wallets
    pub legacy_cold_wallets: BTreeMap<LegacyAddress, LegacyColdWallet>,

    // Keeps track of all merged legacy cold wallets in this commit;
    // If an address is found in the map, then a lookup for presence of cold wallet has been performed.
    // The option indicates whether a corresponding cold wallet has been found and merged. To avoid
    // redundant lookups, any address present in the map is skipped when processing a transaction.
    pub merged_legacy_cold_wallets: BTreeMap<Address, Option<(B256, LegacyAddress)>>,

    // Optimization to avoid unnecessary (deep) clones of commit data.
    pub built_commit: Option<StateCommit>,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
pub struct GenesisInfo {
    pub account: Address,
    pub deployer_account: Address,
    pub validator_contract: Address,
    pub username_contract: Address,
    pub initial_block_number: u64,
    pub initial_supply: U256,
}

pub struct PersistentDB {
    pub(crate) env: heed::Env,
    pub(crate) inner: RefCell<InnerStorage>,
    pub(crate) accounts_history: Option<AccountHistory>,
    resize_lock: Arc<RwLock<()>>,
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
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),
    #[error("BytecodeDecode error: {0}")]
    BytecodeDecode(#[from] revm::bytecode::BytecodeDecodeError),
    #[error("heed error: {0}")]
    Heed(#[from] heed::Error),
    #[error("state error: {0}")]
    State(String),
    #[error("db full error")]
    DbFull,
    #[error("bincode error: {0}")]
    Bincode(#[from] bincode::Error),
    #[error("infallible error: {0}")]
    Infallible(#[from] Infallible),
    #[error("Lock error")]
    Lock,
}

impl DBErrorMarker for Error {}

static ENV: LazyLock<RwLock<HashMap<PathBuf, (heed::Env, Arc<RwLock<()>>)>>> =
    LazyLock::new(RwLock::default);

impl PersistentDB {
    const MAX_DBS: u32 = 12;

    pub fn new(opts: PersistentDBOptions) -> Result<Self, Error> {
        std::fs::create_dir_all(&opts.path)?;

        let mut lock = ENV.write().map_err(|_| Error::Lock)?;

        let (env, resize_lock) = match lock.get(&opts.path) {
            Some((env, resize_lock)) => (env.clone(), resize_lock.clone()),
            None => {
                let mut env_builder = EnvOpenOptions::new();

                let mut max_dbs = Self::MAX_DBS;
                if opts.history_size.is_some() {
                    max_dbs += 1;
                }

                env_builder.max_dbs(max_dbs);
                env_builder.map_size(1 * MAP_SIZE_UNIT);
                unsafe { env_builder.flags(EnvFlags::NO_SUB_DIR) };

                let env = unsafe { env_builder.open(opts.path.join("evm.mdb")) }?;
                // One resize gate per env, shared by every instance for this path.
                let resize_lock = Arc::new(RwLock::new(()));
                lock.insert(opts.path.clone(), (env.clone(), resize_lock.clone()));

                (env, resize_lock)
            }
        };

        Self::new_with_env(env, resize_lock, opts)
    }

    pub fn new_with_env(
        env: heed::Env,
        resize_lock: Arc<RwLock<()>>,
        opts: PersistentDBOptions,
    ) -> Result<Self, Error> {
        let real_disk_size = env.real_disk_size()?;
        if real_disk_size >= env.info().map_size as u64 {
            // Ensure initial map size is always larger than disk size. Resize requires exclusive
            // access to the (possibly shared) env, so take the write side of the gate.
            let _resize_guard = resize_lock.write().map_err(|_| Error::Lock)?;
            unsafe { env.resize(next_map_size(real_disk_size as usize))? };
        }

        // Database creation is a write txn; hold the read side so a concurrent resize on the
        // shared env cannot remap memory underneath it. Dropped right after commit, before
        // `resize_lock` is moved into the struct.
        let init_guard = resize_lock.read().map_err(|_| Error::Lock)?;

        let tx_env = env.clone();
        let mut wtxn = tx_env.write_txn()?;

        let accounts = env.create_database::<AddressWrapper, CompactBincode<StoredAccountInfo>>(
            &mut wtxn,
            Some("accounts"),
        )?;

        let (accounts_history_db, accounts_history) = match opts.history_size {
            Some(history_size) if history_size > 0 => {
                let db = env.create_database::<HeedBlockNumber,CompactBincode<
            BTreeMap<Address, HistoricalAccountData>>>(&mut wtxn, Some("accounts_history")) ?;
                (Some(db), Some(AccountHistory::new(history_size)))
            }
            _ => (None, None),
        };

        let commits = env.create_database::<HeedBlockNumber, CompactBincode<CommitReceipts>>(
            &mut wtxn,
            Some("commits"),
        )?;
        let contracts = env.create_database::<HashWrapper, CompactBincode<StoredBytecode>>(
            &mut wtxn,
            Some("contracts"),
        )?;
        let legacy_attributes = env
            .create_database::<AddressWrapper, CompactBincode<LegacyAccountAttributes>>(
                &mut wtxn,
                Some("legacy_attributes"),
            )?;
        let legacy_cold_wallets = env
            .create_database::<LegacyAddressWrapper, CompactBincode<LegacyColdWallet>>(
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

        // Carried over from previous database-service.ts lmdb backend
        let state = env.create_database::<StaticStringWrapper, heed::types::SerdeBincode<Bytes>>(
            &mut wtxn,
            Some("state"),
        )?;
        let proofs = env.create_database::<HeedBlockNumber, CompactBincode<ProofData>>(
            &mut wtxn,
            Some("proofs"),
        )?;
        let blocks = env.create_database::<HeedBlockNumber, CompactBincode<BlockHeaderData>>(
            &mut wtxn,
            Some("blocks"),
        )?;
        let blocks_hash_number = env.create_database::<HashWrapper, HeedBlockNumber>(
            &mut wtxn,
            Some("blocks_hash_number"),
        )?;
        let transactions = env.create_database::<TransactionKey, CompactBincode<TransactionData>>(
            &mut wtxn,
            Some("transactions"),
        )?;
        let transactions_hash_key = env.create_database::<HashWrapper, TransactionKey>(
            &mut wtxn,
            Some("transactions_hash_key"),
        )?;

        wtxn.commit()?;
        drop(init_guard);

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
                state,
                blocks_hash_number,
                blocks,
                proofs,
                transactions_hash_key,
                transactions,
            }),
            accounts_history,
            resize_lock,
            logger: opts.logger.unwrap_or_default(),
            genesis_info: None,
        })
    }

    pub fn set_genesis_info(&mut self, genesis_info: GenesisInfo) -> Result<(), Error> {
        self.with_write_txn(|wtxn| {
            let inner = self.inner.borrow_mut();

            if inner
                .accounts
                .get(wtxn, &AddressWrapper(genesis_info.account))?
                .is_none()
            {
                inner.accounts.put(
                    wtxn,
                    &AddressWrapper(genesis_info.account),
                    &CompactBincode(&StoredAccountInfo::new(
                        genesis_info.initial_supply,
                        0,
                        KECCAK_EMPTY,
                    )),
                )?;
            }

            Ok(())
        })?;

        self.genesis_info.replace(genesis_info);
        Ok(())
    }

    pub fn get_accounts(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<AccountInfoExtended>), Error> {
        self.with_read_txn(|tx_env| {
            let iter = self
                .inner
                .borrow()
                .accounts
                .iter(tx_env)?
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
                    .get(tx_env, &AddressWrapper(account.address))?
                {
                    account.legacy_attributes = legacy_attributes.0;
                }
            }

            Ok((cursor, accounts))
        })
    }

    pub fn get_legacy_cold_wallets(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<LegacyColdWallet>), Error> {
        self.with_read_txn(|tx_env| {
            let iter = self
                .inner
                .borrow()
                .legacy_cold_wallets
                .iter(tx_env)?
                .skip(offset as usize);

            self.get_items(
                iter,
                |item| match item {
                    Some(item) => {
                        let (_, legacy_cold_wallet) = item?;
                        Ok(Some(legacy_cold_wallet.0))
                    }
                    None => Ok(None),
                },
                offset,
                limit,
            )
        })
    }

    pub fn get_receipts(
        &self,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<(u64, Vec<(B256, TxReceipt)>)>), Error> {
        self.with_read_txn(|tx_env| {
            let iter = self
                .inner
                .borrow()
                .commits
                .iter(tx_env)?
                .skip(offset as usize);

            self.get_items(
                iter,
                |item| match item {
                    Some(item) => {
                        let (block_number, commit) = item?;
                        Ok(Some((
                            block_number,
                            commit.0.tx_receipts.into_iter().collect(),
                        )))
                    }
                    None => Ok(None),
                },
                offset,
                limit,
            )
        })
    }

    pub fn get_receipts_by_block_number(
        &self,
        block_number: u64,
    ) -> Result<HashMap<B256, TxReceipt>, Error> {
        self.with_read_txn(|tx_env| {
            let commit = self.inner.borrow().commits.get(tx_env, &block_number)?;

            match commit {
                Some(inner) => Ok(inner.0.tx_receipts),
                None => Ok(Default::default()),
            }
        })
    }

    pub fn get_receipts_by_block_range(
        &self,
        from_block_number: u64,
        to_block_number: u64,
    ) -> Result<Vec<(u64, Vec<(B256, TxReceipt)>)>, Error> {
        assert!(
            from_block_number <= to_block_number,
            "from_block_number ({from_block_number}) must be <= to_block_number ({to_block_number})"
        );

        self.with_read_txn(|tx_env| {
            let inner = self.inner.borrow();
            let range = from_block_number..=to_block_number;

            let capacity = to_block_number.saturating_sub(from_block_number).min(1024) as usize;
            let mut receipts = Vec::with_capacity(capacity);

            for item in inner.commits.range(&tx_env, &range)? {
                let (block_number, commit) = item?;
                receipts.push((block_number, commit.0.tx_receipts.into_iter().collect()));
            }

            Ok(receipts)
        })
    }

    pub fn get_commits_by_block_range(
        &self,
        from_block_number: u64,
        to_block_number: u64,
        max_bytes: u64,
    ) -> Result<Vec<(ProofData, BlockHeaderData, Vec<TransactionData>)>, Error> {
        assert!(
            from_block_number <= to_block_number,
            "from_block_number ({from_block_number}) must be <= to_block_number ({to_block_number})"
        );
        assert!(max_bytes > 0, "max_bytes ({max_bytes}) must be > 0");

        // Per-commit fixed cost charged against the budget on top of the block's transaction payload,
        // so that a long run of (near-)empty blocks is still bounded by block count, not just bytes.
        const PER_COMMIT_OVERHEAD_BYTES: u64 = 1024;

        self.with_read_txn(|tx_env| {
            let inner = self.inner.borrow();

            let capacity = to_block_number.saturating_sub(from_block_number).min(512) as usize;
            let mut commits = Vec::with_capacity(capacity);
            let mut accumulated_bytes: u64 = 0;

            for item in inner
                .blocks
                .range(tx_env, &(from_block_number..=to_block_number))?
            {
                let (block_number, header) = item?;
                let estimated_bytes = header.0.payload_size as u64 + PER_COMMIT_OVERHEAD_BYTES;
                accumulated_bytes += estimated_bytes;
                if accumulated_bytes > max_bytes {
                    break;
                }

                // Headers and proofs are written together per commit; a missing proof means the end of
                // the available data has been reached.
                let Some(proof) = inner.proofs.get(tx_env, &block_number)? else {
                    break;
                };

                // Collect this block's transactions via a single range scan over its key prefix; the
                // keys sort by (block_number, index), so they arrive in index order.
                let mut transactions = Vec::with_capacity(header.0.transactions_count as usize);
                let tx_from = TransactionKey::new(block_number, 0);
                let tx_to = TransactionKey::new(block_number, u16::MAX);
                for tx_item in inner.transactions.range(tx_env, &(tx_from..=tx_to))? {
                    let (_, transaction) = tx_item?;
                    transactions.push(transaction.0);
                }

                commits.push((proof.0, header.0, transactions));
            }

            Ok(commits)
        })
    }

    pub fn get_historical_account_info(
        &self,
        block_number: u64,
        address: Address,
    ) -> Result<(Option<AccountInfo>, bool), Error> {
        match self.inner.borrow().accounts_history {
            Some(db) => self.with_read_txn(|tx_env| match self.accounts_history.as_ref() {
                Some(accounts_history) => {
                    let (data, missing_fallback) = accounts_history.get_by_block_and_address(
                        tx_env,
                        &db,
                        block_number,
                        &address,
                    )?;

                    match data {
                        Some(data) => Ok((
                            Some(AccountInfo {
                                balance: data.balance,
                                nonce: data.nonce,
                                code_hash: data.code_hash,
                                ..Default::default()
                            }),
                            missing_fallback,
                        )),
                        None => Ok((None, missing_fallback)),
                    }
                }
                None => Ok((None, false)),
            }),
            None => Ok((None, false)),
        }
    }

    pub fn get_legacy_attributes(
        &self,
        address: Address,
    ) -> Result<Option<LegacyAccountAttributes>, Error> {
        self.with_read_txn(|tx_env| {
            Ok(self
                .inner
                .borrow()
                .legacy_attributes
                .get(tx_env, &AddressWrapper(address))?
                .map(|inner| inner.0))
        })
    }

    pub fn get_legacy_cold_wallet(
        &self,
        address: LegacyAddress,
    ) -> Result<Option<LegacyColdWallet>, Error> {
        self.with_read_txn(|tx_env| {
            Ok(self
                .inner
                .borrow()
                .legacy_cold_wallets
                .get(tx_env, &LegacyAddressWrapper(address))?
                .map(|inner| inner.0))
        })
    }

    pub fn resize(&self) -> Result<(), Error> {
        // Exclusive access: blocks until every in-flight transaction (across all instances sharing
        // this env in the process) has released its read guard, and prevents new ones from starting
        // until the remap completes. This is what makes the unsafe env.resize() sound.
        let _resize_guard = self.resize_lock.write().map_err(|_| Error::Lock)?;

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

impl PersistentDB {
    fn basic_ref_tx(
        &self,
        txn: &heed::RoTxn,
        address: Address,
    ) -> Result<Option<AccountInfo>, Error> {
        let inner = self.inner.borrow();

        let basic = inner
            .accounts
            .get(txn, &AddressWrapper(address))?
            .map(|a| a.0.into());

        Ok(basic)
    }

    fn code_by_hash_ref_tx(&self, txn: &heed::RoTxn, code_hash: B256) -> Result<Bytecode, Error> {
        let inner = self.inner.borrow();

        let contract = match inner.contracts.get(txn, &HashWrapper(code_hash))? {
            Some(contract) => contract.0,
            None => Default::default(),
        };

        Ok(contract.try_into()?)
    }

    fn storage_ref_tx(
        &self,
        txn: &heed::RoTxn,
        address: Address,
        index: U256,
    ) -> Result<U256, Error> {
        let inner = self.inner.borrow_mut();

        let mut iter = inner.storage.iter(txn)?;
        let location = &StorageEntryWrapper(index, U256::ZERO);

        match iter.move_on_key_dup(&AddressWrapper(address), &location)? {
            Some((_, value)) if value.0 == location.0 => Ok(value.1),
            _ => Ok(U256::ZERO),
        }
    }

    fn block_hash_ref_tx(&self, txn: &heed::RoTxn, number: u64) -> Result<B256, Error> {
        let inner = self.inner.borrow_mut();

        let data = inner.blocks.get(txn, &number)?;
        match data {
            Some(data) => Ok(data.hash),
            None => Ok(B256::ZERO),
        }
    }
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
        self.with_read_txn(|txn| self.basic_ref_tx(txn, address))
    }

    fn code_by_hash_ref(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.with_read_txn(|txn| self.code_by_hash_ref_tx(txn, code_hash))
    }

    fn storage_ref(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.with_read_txn(|txn| self.storage_ref_tx(txn, address, index))
    }

    fn block_hash_ref(&self, number: u64) -> Result<B256, Self::Error> {
        self.with_read_txn(|txn| self.block_hash_ref_tx(txn, number))
    }
}

/// `DatabaseRef` view that serves all reads from one `RoTxn` instead of opening one per read.
/// Holds the resize gate for the txn's lifetime so the env can't be remapped while it's open.
pub struct TxnDatabaseReader<'a> {
    db: &'a PersistentDB,
    txn: heed::RoTxn<'a, heed::WithTls>,
    _resize_guard: RwLockReadGuard<'a, ()>,
}

impl<'a> TxnDatabaseReader<'a> {
    pub fn new(db: &'a PersistentDB) -> Result<Self, Error> {
        let resize_guard = db.resize_lock.read().map_err(|_| Error::Lock)?;
        let txn = db.env.read_txn()?;
        Ok(Self {
            db,
            txn,
            _resize_guard: resize_guard,
        })
    }
}

impl DatabaseRef for TxnDatabaseReader<'_> {
    type Error = Error;
    fn basic_ref(&self, address: Address) -> Result<Option<AccountInfo>, Error> {
        self.db.basic_ref_tx(&self.txn, address)
    }
    fn storage_ref(&self, address: Address, index: U256) -> Result<U256, Error> {
        self.db.storage_ref_tx(&self.txn, address, index)
    }
    fn code_by_hash_ref(&self, hash: B256) -> Result<Bytecode, Error> {
        self.db.code_by_hash_ref_tx(&self.txn, hash)
    }
    fn block_hash_ref(&self, number: u64) -> Result<B256, Error> {
        self.db.block_hash_ref_tx(&self.txn, number)
    }
}

impl PersistentDB {
    pub fn commit(
        &self,
        state_commit: &mut StateCommit,
        commit_data: &Option<CommitData>,
    ) -> Result<(), Error> {
        let StateCommit {
            key,
            change_set,
            results,
        } = state_commit;

        match self.commit_to_db(key, change_set, commit_data, results) {
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
        key: &CommitKey,
        change_set: &mut state_changes::StateChangeset,
        commit_data: &Option<CommitData>,
        results: &BTreeMap<B256, (ExecutionResult, u64)>,
    ) -> Result<(), Error> {
        self.with_write_txn(|rwtxn| {
            if self.is_block_committed(&rwtxn, key.0) {
                return Err(Error::State("block already committed".into()));
            }

            let inner = self.inner.borrow_mut();

            let state_changes::StateChangeset {
                accounts,
                storage,
                contracts,
                legacy_attributes,
                legacy_cold_wallets,
                merged_legacy_cold_wallets,
            } = change_set;

            // Update accounts
            for (address, account) in accounts.iter() {
                let address = AddressWrapper(*address);

                if let Some(account) = account {
                    inner.accounts.put(
                        rwtxn,
                        &address,
                        &CompactBincode(&StoredAccountInfo::new(
                            account.balance,
                            account.nonce,
                            account.code_hash,
                        )),
                    )?;
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
                    .put(rwtxn, &address, &CompactBincode(legacy_attributes))?;
            }

            // Update legacy cold wallets
            for (address, legacy_cold_wallets) in legacy_cold_wallets.into_iter() {
                let address = LegacyAddressWrapper(*address);
                inner.legacy_cold_wallets.put(
                    rwtxn,
                    &address,
                    &CompactBincode(legacy_cold_wallets),
                )?;
            }

            // Update contracts
            for (hash, bytecode) in contracts.into_iter() {
                inner.contracts.put(
                    rwtxn,
                    &HashWrapper(*hash),
                    &CompactBincode(&bytecode.clone().into()),
                )?;
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
                    .expect("legacy cold wallet to be found")
                    .0;

                assert!(legacy_cold_wallet.merge_info.is_none());
                legacy_cold_wallet.merge_info.replace((legacy.0, *address));

                inner
                    .legacy_cold_wallets
                    .put(rwtxn, key, &CompactBincode(&legacy_cold_wallet))?;

                // The legacy balance has already been applied to the `PendingCommit`,
                // thus only the legacy attributes need to be moved to a different storage.
                inner.legacy_attributes.put(
                    rwtxn,
                    &AddressWrapper(*address),
                    &CompactBincode(&legacy_cold_wallet.legacy_attributes),
                )?;
            }

            // ========================================
            //
            if let Some(commit_data) = commit_data {
                let CommitData {
                    proof,
                    header,
                    transactions,
                } = commit_data;

                // Update blocks
                inner.blocks.put(rwtxn, &key.0, &CompactBincode(header))?;
                inner
                    .blocks_hash_number
                    .put(rwtxn, &HashWrapper(header.hash), &key.0)?;

                // Update proofs
                inner.proofs.put(rwtxn, &key.0, &CompactBincode(proof))?;

                // Update transactions
                for (sequence, _) in transactions.iter().enumerate() {
                    debug_assert!(sequence <= u16::MAX as usize);

                    let key = TransactionKey::new(key.0, sequence as u16);
                    let transaction = &transactions[sequence];

                    inner.transactions_hash_key.put(
                        rwtxn,
                        &HashWrapper(transaction.tx_hash),
                        &key,
                    )?;

                    inner
                        .transactions
                        .put(rwtxn, &key, &CompactBincode(transaction))?;
                }

                // Update state
                let total_round_key = StaticStringWrapper("total_round");
                let current_total_round =
                    read_total_round(inner.state.get(rwtxn, &total_round_key)?);

                inner.state.put(
                    rwtxn,
                    &total_round_key,
                    &Bytes::from_iter((current_total_round + proof.round as u64 + 1).to_le_bytes()),
                )?;
            }
            // ========================================

            // Finalize commit
            let mut tx_receipts = HashMap::default();
            for (k, (result, cumulative_gas_used)) in results {
                let receipt = map_execution_result(result.clone(), *cumulative_gas_used);
                tx_receipts.insert(k.clone(), receipt);
            }

            inner.commits.put(
                rwtxn,
                &key.0,
                &CompactBincode(&CommitReceipts { tx_receipts }),
            )?;

            Ok(())
        })
    }

    pub fn is_block_committed(&self, rtxn: &heed::RoTxn, block_number: u64) -> bool {
        self.inner
            .borrow()
            .commits
            .get(rtxn, &block_number)
            .is_ok_and(|v| v.is_some())
    }

    pub fn get_receipt(
        &self,
        block_number: u64,
        tx_hash: B256,
    ) -> Result<(bool, Option<TxReceipt>), Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            match inner.commits.get(rtxn, &block_number)? {
                Some(receipts) => Ok((true, receipts.tx_receipts.get(&tx_hash).cloned())),
                None => Ok((false, None)),
            }
        })
    }

    pub fn is_empty(&self) -> Result<bool, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner.blocks.is_empty(rtxn)?)
        })
    }

    pub fn get_state(&self) -> Result<(u64, u64), Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            let total_round =
                read_total_round(inner.state.get(rtxn, &StaticStringWrapper("total_round"))?);

            let block_number = match inner.blocks.last(rtxn)? {
                Some((block_number, _)) => block_number,
                None => 0,
            };

            Ok((block_number, total_round))
        })
    }

    pub fn get_block_number_by_hash(&self, block_hash: B256) -> Result<Option<u64>, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner
                .blocks_hash_number
                .get(rtxn, &HashWrapper(block_hash))?)
        })
    }

    pub fn get_proof_data(&self, block_number: u64) -> Result<Option<ProofData>, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner.proofs.get(rtxn, &block_number)?.map(|data| data.0))
        })
    }

    pub fn get_block_header_data(
        &self,
        block_number: u64,
    ) -> Result<Option<BlockHeaderData>, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner.blocks.get(rtxn, &block_number)?.map(|data| data.0))
        })
    }

    pub fn get_transaction(&self, key: TransactionKey) -> Result<Option<TransactionData>, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner.transactions.get(rtxn, &key)?.map(|data| data.0))
        })
    }

    pub fn get_transaction_data(&self, key: String) -> Result<Option<TransactionData>, Error> {
        match TransactionKey::parse(&key) {
            Some(key) => self.get_transaction(key),
            None => Ok(None),
        }
    }

    pub fn get_transaction_key_by_hash(&self, tx_hash: B256) -> Result<Option<String>, Error> {
        self.with_read_txn(|rtxn| {
            let inner = self.inner.borrow();

            Ok(inner
                .transactions_hash_key
                .get(rtxn, &HashWrapper(tx_hash))?
                .map(|key| key.to_token()))
        })
    }

    /// Runs `f` inside a read txn while holding the shared resize guard, so the env can't be remapped
    /// (mdb_env_set_mapsize) while the txn is live.
    fn with_read_txn<T>(
        &self,
        f: impl FnOnce(&heed::RoTxn) -> Result<T, Error>,
    ) -> Result<T, Error> {
        let _resize_guard = self.resize_lock.read().map_err(|_| Error::Lock)?;
        let txn = self.env.read_txn()?;
        f(&txn)
    }

    /// Runs `f` inside a write txn while holding the shared resize guard, so the env can't be remapped
    /// (mdb_env_set_mapsize) while the txn is live.
    fn with_write_txn<T>(
        &self,
        f: impl FnOnce(&mut heed::RwTxn) -> Result<T, Error>,
    ) -> Result<T, Error> {
        let _resize_guard = self.resize_lock.read().map_err(|_| Error::Lock)?;
        let mut txn = self.env.write_txn()?;
        let out = f(&mut txn)?;
        txn.commit()?;
        Ok(out)
    }
}

fn read_total_round(item: Option<Bytes>) -> u64 {
    match item {
        Some(total_round) => {
            assert_eq!(total_round.len(), 8);
            let mut buffer = [0u8; 8];
            buffer[..8].copy_from_slice(&total_round[..8]);
            u64::from_le_bytes(buffer)
        }
        None => 0,
    }
}

impl PendingCommit {
    pub fn new(key: CommitKey) -> Self {
        Self {
            key,
            cache: Default::default(),
            cumulative_gas_used: Default::default(),
            results: Default::default(),
            transitions: Default::default(),
            legacy_attributes: Default::default(),
            legacy_cold_wallets: Default::default(),
            merged_legacy_cold_wallets: Default::default(),
            built_commit: Default::default(),
        }
    }

    pub fn import_account(
        &mut self,
        address: Address,
        info: AccountInfo,
        legacy_attributes: Option<LegacyAccountAttributes>,
    ) {
        let mut state = revm::database::State::builder()
            .with_bundle_update()
            .with_cached_prestate(std::mem::take(&mut self.cache))
            .build();

        let account = state
            .load_cache_account(address)
            .expect("load_cache_account");

        let balance = info.balance.try_into().expect("fit u128");
        let transition_account = account
            .increment_balance(balance)
            .unwrap_or_else(|| TransitionAccount::new_empty_eip161(Default::default()));

        let transitions = vec![(address, transition_account)];

        self.transitions.add_transitions(transitions);

        self.cache = std::mem::take(&mut state.cache);

        if let Some(legacy_attributes) = legacy_attributes {
            self.legacy_attributes.insert(address, legacy_attributes);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::{
        account::StoredAccountInfo,
        compression::CompactBincode,
        db::{
            AddressWrapper, BlockHeaderData, CommitData, CommitKey, CommitReceipts, HashWrapper,
            LegacyAddressWrapper, MAP_SIZE_UNIT, PendingCommit, PersistentDB, PersistentDBOptions,
            ProofData, StaticStringWrapper, StorageEntryWrapper, TransactionData, TransactionKey,
            TxnDatabaseReader, next_map_size,
        },
        historical::HistoricalAccountData,
        legacy::{LegacyAccountAttributes, LegacyAddress, LegacyColdWallet},
        logger::Logger,
        receipt::TxReceipt,
        state_changes::{StateChangeset, StorageChangeset},
        state_commit::{StateCommit, build_commit},
    };
    use alloy_primitives::{Address, B256, Bytes, U256, address, b256};
    use revm::{
        Database, DatabaseRef,
        context::result::{ExecutionResult, ResultGas, SuccessReason},
        database::{TransitionState, states::StorageSlot},
        primitives::HashMap,
        state::{AccountInfo, Bytecode},
    };

    use heed::{BytesDecode, BytesEncode, EnvFlags, EnvOpenOptions};

    #[test]
    fn test_open_db() {
        let tmp = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        assert!(PersistentDB::new(PersistentDBOptions::new(tmp.path().to_path_buf())).is_ok());
    }

    #[test]
    fn test_open_db_with_logger() {
        let tmp = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        assert!(
            PersistentDB::new(
                PersistentDBOptions::new(tmp.path().to_path_buf()).with_logger(Logger::new(None))
            )
            .is_ok()
        );
    }

    #[test]
    fn test_commit_changes() {
        let mut db = create_temp_database();

        // 1) Lookup empty account
        let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let account = db.basic(address).expect("works");
        assert_eq!(account, None);

        // 2) Update balance for account
        let mut state = HashMap::default();

        let mut account = revm::state::Account::new_not_existing(revm::state::TransactionId::ZERO);
        account.info.balance = U256::from(100);
        account.status = revm::state::AccountStatus::Touched;

        let code = Bytecode::new();
        account.info.code_hash = code.hash_slow();
        account.info.code = Some(code.clone());

        let mut storage = HashMap::default();
        storage.insert(
            U256::from(1),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(1234)),
        );
        storage.insert(
            U256::from(2),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(5678)),
        );

        state.insert(
            address,
            revm::database::TransitionAccount {
                status: revm::database::AccountStatus::InMemoryChange,
                info: Some(account.info.clone()),
                previous_status: revm::database::AccountStatus::Loaded,
                previous_info: None,
                storage,
                storage_was_destroyed: false,
            },
        );

        crate::state_commit::commit_to_db(
            &mut db,
            PendingCommit {
                key: CommitKey::default(),
                transitions: TransitionState { transitions: state },
                ..Default::default()
            },
            Default::default(),
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
    fn test_commit_built() {
        let mut db = create_temp_database();
        let mut pending_commit = PendingCommit::default();
        pending_commit.built_commit = Some(build_commit(&mut pending_commit).unwrap());

        crate::state_commit::commit_to_db(&mut db, pending_commit, Default::default()).unwrap();
    }

    #[test]
    fn test_commit_built_without_precomputed_hashes() {
        let mut db = create_temp_database();
        let mut pending_commit = PendingCommit::default();
        pending_commit.built_commit = Some(build_commit(&mut pending_commit).unwrap());

        crate::state_commit::commit_to_db(&mut db, pending_commit, Default::default()).unwrap();
    }

    #[test]
    fn test_storage() {
        let mut db = create_temp_database();

        let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let mut state = HashMap::default();

        let mut account = revm::state::Account::new_not_existing(revm::state::TransactionId::ZERO);
        account.status = revm::state::AccountStatus::Touched;

        let mut storage = HashMap::default();

        storage.insert(
            U256::from(99),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(99)),
        );
        storage.insert(
            U256::from(1),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
        );
        storage.insert(
            U256::from(101),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(101)),
        );
        storage.insert(
            U256::from(2),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(2)),
        );
        storage.insert(
            U256::from(4),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(4)),
        );

        state.insert(
            address,
            revm::database::TransitionAccount {
                status: revm::database::AccountStatus::InMemoryChange,
                info: Some(account.info.clone()),
                previous_status: revm::database::AccountStatus::Loaded,
                previous_info: None,
                storage,
                storage_was_destroyed: false,
            },
        );

        crate::state_commit::commit_to_db(
            &mut db,
            PendingCommit {
                key: CommitKey::default(),
                transitions: TransitionState { transitions: state },
                ..Default::default()
            },
            Default::default(),
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
        let mut db = create_temp_database();

        let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
        let mut state = HashMap::default();

        let mut account = revm::state::Account::new_not_existing(revm::state::TransactionId::ZERO);
        account.status = revm::state::AccountStatus::Touched;

        let mut storage = HashMap::default();

        storage.insert(
            U256::from(1),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
        );
        storage.insert(
            U256::from(2),
            revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(2)),
        );

        state.insert(
            address,
            revm::database::TransitionAccount {
                status: revm::database::AccountStatus::InMemoryChange,
                info: Some(account.info.clone()),
                previous_status: revm::database::AccountStatus::Loaded,
                previous_info: None,
                storage,
                storage_was_destroyed: false,
            },
        );

        crate::state_commit::commit_to_db(
            &mut db,
            PendingCommit {
                key: CommitKey::default(),
                transitions: TransitionState { transitions: state },
                ..Default::default()
            },
            Default::default(),
        )
        .expect("ok");

        // Assert storage
        let mut account_storage = db.storage(address, U256::from(1)).expect("storage");
        assert_eq!(account_storage, U256::from(1));
        account_storage = db.storage(address, U256::from(2)).expect("storage");
        assert_eq!(account_storage, U256::from(2));

        // Now overwrite index 1
        let mut storage = HashMap::default();
        storage.insert(
            U256::from(1),
            revm::database::states::StorageSlot::new_changed(U256::from(1), U256::from(99)),
        );

        let mut state = HashMap::default();
        state.insert(
            address,
            revm::database::TransitionAccount {
                status: revm::database::AccountStatus::Changed,
                info: Some(account.info.clone()),
                previous_status: revm::database::AccountStatus::Loaded,
                previous_info: None,
                storage,
                storage_was_destroyed: false,
            },
        );

        crate::state_commit::commit_to_db(
            &mut db,
            PendingCommit {
                key: CommitKey(1, 0, B256::ZERO),
                transitions: TransitionState { transitions: state },
                ..Default::default()
            },
            Default::default(),
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
        let create_large_commit = |block_number: u64, n: usize| {
            let mut buf = vec![0; 32];
            buf[0..8].copy_from_slice(&block_number.to_le_bytes());
            let address = Address::from_word(ethers_core::utils::keccak256(buf).into());

            let mut state = HashMap::default();

            let mut account =
                revm::state::Account::new_not_existing(revm::state::TransactionId::ZERO);
            account.status = revm::state::AccountStatus::Touched;

            let mut storage = HashMap::default();

            for i in 0..n {
                storage.insert(
                    U256::from(i + 1),
                    revm::database::states::StorageSlot::new_changed(U256::ZERO, U256::from(1)),
                );
            }

            state.insert(
                address,
                revm::database::TransitionAccount {
                    status: revm::database::AccountStatus::InMemoryChange,
                    info: Some(account.info.clone()),
                    previous_status: revm::database::AccountStatus::Loaded,
                    previous_info: None,
                    storage,
                    storage_was_destroyed: false,
                },
            );

            PendingCommit {
                key: CommitKey(block_number, 0, B256::ZERO),
                transitions: TransitionState { transitions: state },
                ..Default::default()
            }
        };

        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        let mut env_builder = EnvOpenOptions::new();
        env_builder.max_dbs(PersistentDB::MAX_DBS);
        env_builder.map_size(4096 * 10); // start with very small (few kB)

        unsafe { env_builder.flags(EnvFlags::NO_SUB_DIR) };

        let env = unsafe { env_builder.open(path.path().join("evm.mdb")) }.expect("ok");

        let mut db = PersistentDB::new_with_env(
            env,
            std::sync::Arc::new(std::sync::RwLock::new(())),
            Default::default(),
        )
        .expect("open");
        assert_eq!(db.env.info().map_size, 4096 * 10);

        // large commit to trigger a resize
        crate::state_commit::commit_to_db(
            &mut db,
            create_large_commit(0, 1024),
            Default::default(),
        )
        .expect("ok");

        // increased to next MAP_SIZE_UNIT
        assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);

        // add more commits without triggering another resize
        for i in 0..10 {
            crate::state_commit::commit_to_db(
                &mut db,
                create_large_commit(i + 1, 1024),
                Default::default(),
            )
            .expect("ok");
            assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);
        }

        // reopen db with initial env size should automatically resize
        drop(db);

        let env = unsafe { env_builder.open(path.path().join("evm.mdb")) }.expect("ok");
        let db = PersistentDB::new_with_env(
            env,
            std::sync::Arc::new(std::sync::RwLock::new(())),
            Default::default(),
        )
        .expect("open");
        assert_eq!(db.env.info().map_size, MAP_SIZE_UNIT);
    }

    #[test]
    fn test_read_accounts() {
        let db = create_temp_database();

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
                        &CompactBincode(&StoredAccountInfo {
                            balance: U256::from(index),
                            nonce: index as u64,
                            ..Default::default()
                        }),
                    )
                    .unwrap();

                db.inner
                    .borrow_mut()
                    .legacy_attributes
                    .put(
                        &mut wtxn,
                        &AddressWrapper(*address),
                        &CompactBincode(&LegacyAccountAttributes::default()),
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
            for _ in accounts {
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
    fn test_get_cold_wallets() {
        let db = create_temp_database();

        let legacy_addresses = [
            "DBYyh2vXcigrJGUHfvmYxVxEqeH7vomw6x",
            "D5KU9KrMYXdkEsRbv4y8hvetGbsJwf9z3P",
            "DJA2sqCbnmR63sD8doGrXrK3fCiqcA4GUw",
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt",
        ];

        {
            let mut wtxn = db.env.write_txn().unwrap();

            for (index, legacy) in legacy_addresses.iter().enumerate() {
                let legacy_address: LegacyAddress = (*legacy).try_into().unwrap();
                db.inner
                    .borrow_mut()
                    .legacy_cold_wallets
                    .put(
                        &mut wtxn,
                        &LegacyAddressWrapper(legacy_address),
                        &CompactBincode(&LegacyColdWallet {
                            address: legacy_address,
                            balance: U256::from(index),
                            legacy_attributes: Default::default(),
                            merge_info: None,
                        }),
                    )
                    .unwrap();
            }
            wtxn.commit().unwrap();
        }

        const LIMIT: u64 = 2;
        let mut offset = 0;

        let mut read = 0;

        loop {
            let (next, wallets) = db.get_legacy_cold_wallets(offset, LIMIT).unwrap();
            for wallet in wallets {
                read += 1;

                let cold_wallet = db.get_legacy_cold_wallet(wallet.address).unwrap();
                assert_eq!(cold_wallet, Some(wallet));
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

        assert_eq!(read, legacy_addresses.len());
    }

    #[test]
    fn test_get_account_history() {
        let address1 = address!("0000000000000000000000000000000000000001");
        let address2 = address!("0000000000000000000000000000000000000002");

        {
            let db = create_temp_database();
            let history = db.get_historical_account_info(1, address2).unwrap();
            assert_eq!(history, (None, false));
        }

        let db = create_temp_database_opts(|opts| {
            opts.history_size = Some(8);
        });

        assert!(db.accounts_history.is_some());

        {
            let mut wtxn = db.env.write_txn().unwrap();

            let mut entries = BTreeMap::default();
            entries.insert(
                address1,
                HistoricalAccountData {
                    balance: U256::from(1),
                    nonce: 0,
                    code_hash: B256::ZERO,
                },
            );

            db.inner
                .borrow_mut()
                .accounts_history
                .unwrap()
                .put(&mut wtxn, &1, &CompactBincode(&entries))
                .unwrap();

            wtxn.commit().unwrap();
        }

        let history = db.get_historical_account_info(1, address1).unwrap();
        assert_eq!(
            history,
            (
                Some(AccountInfo {
                    balance: U256::from(1),
                    nonce: 0,
                    code_hash: B256::ZERO,
                    ..Default::default()
                }),
                false
            )
        );

        let history = db.get_historical_account_info(1, address2).unwrap();
        assert_eq!(history, (None, true));
    }

    #[test]
    fn test_legacy_address_wrapper() {
        let legacy_address: LegacyAddress =
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap();

        let wrapper = LegacyAddressWrapper(legacy_address);
        let serialized = <LegacyAddressWrapper as BytesEncode>::bytes_encode(&wrapper).expect("ok");

        let deserialized =
            <LegacyAddressWrapper as BytesDecode>::bytes_decode(&serialized).expect("ok");
        assert_eq!(legacy_address, deserialized.0);
    }

    #[test]
    fn test_static_string_wrapper() {
        let string = "test";

        let wrapper = StaticStringWrapper(string);
        let serialized = <StaticStringWrapper as BytesEncode>::bytes_encode(&wrapper).expect("ok");

        assert_eq!(serialized, &b"test"[..]);
    }

    #[test]
    fn test_commit_key() {
        let key = CommitKey(0, 0, B256::ZERO);
        let mut pending = PendingCommit::new(key);

        let info = AccountInfo {
            balance: U256::ONE,
            nonce: 1,
            code_hash: b256!("0000000000000000000000000000000000000000000000000000000000000001"),
            account_id: None,
            code: None,
        };

        let attributes = LegacyAccountAttributes {
            legacy_nonce: Some(0),
            second_public_key: Some("key".into()),
            multi_signature: None,
        };

        pending.import_account(
            address!("0000000000000000000000000000000000000001"),
            info,
            Some(attributes),
        );

        let info = AccountInfo {
            balance: U256::ZERO,
            nonce: 0,
            code_hash: B256::ZERO,
            account_id: None,
            code: None,
        };
        pending.import_account(
            address!("0000000000000000000000000000000000000002"),
            info,
            None,
        );

        assert_eq!(pending.transitions.transitions.len(), 2);
        assert_eq!(pending.legacy_attributes.len(), 1);
    }

    #[test]
    fn test_basic_ref() {
        let mut db = create_temp_database();

        let genesis = address!("0000000000000000000000000000000000000000");
        let account = address!("0000000000000000000000000000000000000001");
        db.set_genesis_info(crate::db::GenesisInfo {
            account: genesis,
            initial_supply: U256::from(1_000_000),
            ..Default::default()
        })
        .unwrap();

        let info = db.basic(genesis).unwrap();
        assert_eq!(
            info,
            Some(AccountInfo {
                balance: U256::from(1_000_000),
                ..Default::default()
            })
        );

        let info = db.basic(account).unwrap();
        assert_eq!(info, None);
    }

    #[test]
    fn test_code_by_hash() {
        let mut db = create_temp_database();

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");

        assert_eq!(db.code_by_hash(B256::ZERO).unwrap(), Default::default());

        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow_mut();
            inner
                .contracts
                .put(
                    &mut wtxn,
                    &HashWrapper(hash),
                    &CompactBincode(&Bytecode::new_raw(Bytes::from_static(&[0, 1, 2, 3])).into()),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(
            db.code_by_hash(hash).unwrap().original_byte_slice(),
            &[0, 1, 2, 3][..]
        );
    }

    #[test]
    fn test_storage_refe() {
        let mut db = create_temp_database();

        let account = address!("0000000000000000000000000000000000000001");

        assert_eq!(db.storage(account, U256::ZERO).unwrap(), U256::ZERO);
        assert_eq!(db.storage(account, U256::from(1)).unwrap(), U256::ZERO);

        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow_mut();
            inner
                .storage
                .put(
                    &mut wtxn,
                    &AddressWrapper(account),
                    &StorageEntryWrapper(U256::from(1), U256::from(2)),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(db.storage(account, U256::from(1)).unwrap(), U256::from(2));
    }

    #[test]
    fn test_block_hash() {
        let mut db = create_temp_database();

        let hash = db.block_hash(1).unwrap();
        assert_eq!(hash, B256::ZERO);

        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow_mut();

            inner
                .blocks
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&BlockHeaderData {
                        hash: b256!(
                            "0000000000000000000000000000000000000000000000000000000000000001"
                        ),
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        let hash = db.block_hash(1).unwrap();
        assert_eq!(
            hash,
            b256!("0000000000000000000000000000000000000000000000000000000000000001")
        );
    }

    #[test]
    fn test_open_multiple_same_path() {
        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        let db1 =
            PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("db1");

        let db2 =
            PersistentDB::new(PersistentDBOptions::new(path.path().to_path_buf())).expect("db2");

        drop(db1);
        drop(db2);

        assert!(true);
    }

    #[test]
    fn test_set_genesis_info() {
        let mut db = create_temp_database();

        assert_eq!(db.genesis_info, None);

        db.set_genesis_info(Default::default()).expect("ok");

        assert_eq!(db.genesis_info, Some(Default::default()));
    }
    #[test]
    fn test_get_commits_by_block_range() {
        let db = create_temp_database();

        // Empty range before anything is written.
        assert!(
            db.get_commits_by_block_range(1, 3, u64::MAX)
                .unwrap()
                .is_empty()
        );

        // Write blocks 1..=3; block N has N transactions, inserted in reverse sequence order to
        // prove the reader returns them ordered by (block_number, sequence).
        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow();

            for block_number in 1u64..=3 {
                inner
                    .blocks
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&BlockHeaderData {
                            number: block_number as u32,
                            transactions_count: block_number as u16,
                            ..Default::default()
                        }),
                    )
                    .unwrap();

                inner
                    .proofs
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&ProofData {
                            round: block_number as u32,
                            ..Default::default()
                        }),
                    )
                    .unwrap();

                for sequence in (0..block_number).rev() {
                    inner
                        .transactions
                        .put(
                            &mut wtxn,
                            &TransactionKey::new(block_number, sequence as u16),
                            &CompactBincode(&TransactionData {
                                block_number: block_number as u32,
                                index: sequence as u32,
                                tx_hash: B256::from(U256::from(block_number * 100 + sequence)),
                                ..Default::default()
                            }),
                        )
                        .unwrap();
                }
            }

            wtxn.commit().unwrap();
        }

        // Full range (unbounded budget): blocks ascending, transactions per block in sequence order.
        let commits = db.get_commits_by_block_range(1, 3, u64::MAX).unwrap();
        assert_eq!(commits.len(), 3);

        for (index, (proof, header, transactions)) in commits.iter().enumerate() {
            let block_number = (index + 1) as u64;

            assert_eq!(header.number, block_number as u32);
            assert_eq!(proof.round, block_number as u32);
            assert_eq!(transactions.len(), block_number as usize);

            for (sequence, transaction) in transactions.iter().enumerate() {
                assert_eq!(transaction.index, sequence as u32);
                assert_eq!(transaction.block_number, block_number as u32);
            }
        }

        // Sub-range returns only the requested block.
        let commits = db.get_commits_by_block_range(2, 2, u64::MAX).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].1.number, 2);
        assert_eq!(commits[0].2.len(), 2);

        // Range extending past the tip stops at the last available block.
        let commits = db.get_commits_by_block_range(2, 99, u64::MAX).unwrap();
        assert_eq!(commits.len(), 2);

        // A too tiny byte budget stops early and does not make progress.
        let commits = db.get_commits_by_block_range(1, 3, 1).unwrap();
        assert!(commits.is_empty());
    }

    #[test]
    #[should_panic(expected = "must be <= to_block_number")]
    fn test_get_commits_by_block_range_panics_when_from_exceeds_to() {
        let db = create_temp_database();
        let _ = db.get_commits_by_block_range(3, 1, u64::MAX);
    }

    #[test]
    #[should_panic(expected = "must be > 0")]
    fn test_get_commits_by_block_range_panics_when_max_bytes_0() {
        let db = create_temp_database();
        let _ = db.get_commits_by_block_range(1, 3, 0);
    }

    #[test]
    fn test_get_commits_by_block_range_respects_max_bytes() {
        let db = create_temp_database();

        // A commit's budget cost is its payload_size plus a fixed per-commit overhead. Use a payload
        // large enough to dominate that overhead so the expected counts below are unambiguous without
        // coupling the test to the exact overhead constant.
        const PAYLOAD: u32 = 1_000_000;

        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow();

            for block_number in 1u64..=3 {
                inner
                    .blocks
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&BlockHeaderData {
                            number: block_number as u32,
                            payload_size: PAYLOAD,
                            ..Default::default()
                        }),
                    )
                    .unwrap();

                inner
                    .proofs
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&ProofData::default()),
                    )
                    .unwrap();
            }

            wtxn.commit().unwrap();
        }

        let count = |max_bytes: u64| {
            db.get_commits_by_block_range(1, 3, max_bytes)
                .unwrap()
                .len()
        };

        // The budget bounds how many commits come back: ~1 payload fits one, ~2 two, ~3 all three.
        const PER_COMMIT_OVERHEAD_BYTES: u64 = 1024;
        assert_eq!(count(PAYLOAD as u64 + PER_COMMIT_OVERHEAD_BYTES), 1);
        assert_eq!(count(2 * (PAYLOAD as u64 + PER_COMMIT_OVERHEAD_BYTES)), 2);
        assert_eq!(count(3 * (PAYLOAD as u64 + PER_COMMIT_OVERHEAD_BYTES)), 3);

        // An unbounded budget returns the whole range.
        assert_eq!(count(u64::MAX), 3);
    }

    #[test]
    fn test_txn_read_db_serves_all_reads() {
        // TxnReadDb answers every read kind through its single held txn, matching what the
        // transient DatabaseRef path returns (including the empties for unknown entries).
        let db = create_temp_database();

        let account = address!("0000000000000000000000000000000000000001");
        let code = Bytecode::new_raw(Bytes::from_static(&[0, 1, 2, 3]));
        let code_hash = code.hash_slow();
        let block_hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");

        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow_mut();

            inner
                .accounts
                .put(
                    &mut wtxn,
                    &AddressWrapper(account),
                    &CompactBincode(&StoredAccountInfo::new(U256::from(100), 7, code_hash)),
                )
                .unwrap();
            inner
                .contracts
                .put(
                    &mut wtxn,
                    &HashWrapper(code_hash),
                    &CompactBincode(&code.clone().into()),
                )
                .unwrap();
            inner
                .storage
                .put(
                    &mut wtxn,
                    &AddressWrapper(account),
                    &StorageEntryWrapper(U256::from(1), U256::from(42)),
                )
                .unwrap();
            inner
                .blocks
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&BlockHeaderData {
                        hash: block_hash,
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        let read_db = TxnDatabaseReader::new(&db).unwrap();

        let info = read_db.basic_ref(account).unwrap().expect("account");
        assert_eq!(info.balance, U256::from(100));
        assert_eq!(info.nonce, 7);
        assert_eq!(info.code_hash, code_hash);

        assert_eq!(
            read_db
                .code_by_hash_ref(code_hash)
                .unwrap()
                .original_byte_slice(),
            &[0, 1, 2, 3][..]
        );
        assert_eq!(
            read_db.storage_ref(account, U256::from(1)).unwrap(),
            U256::from(42)
        );
        assert_eq!(
            read_db.storage_ref(account, U256::from(2)).unwrap(),
            U256::ZERO
        );
        assert_eq!(read_db.block_hash_ref(1).unwrap(), block_hash);

        // Unknown entries return the documented empties.
        let other = address!("0000000000000000000000000000000000000002");
        assert_eq!(read_db.basic_ref(other).unwrap(), None);
        assert_eq!(read_db.block_hash_ref(2).unwrap(), B256::ZERO);
    }

    #[test]
    fn test_commit_persists_transactions_for_range_read() {
        // Exercises the real write path (commit_to_db via db.commit) end to end, unlike
        // test_get_commits_by_block_range which writes the transactions DB directly. Guards against a
        // key mismatch between how commit_to_db writes transactions and how get_commits_by_block_range
        // scans them.
        let db = create_temp_database();

        let block_number = 1u64;
        let transaction_count = 3u16;

        let transactions: Vec<TransactionData> = (0..transaction_count)
            .map(|index| TransactionData {
                block_number: block_number as u32,
                index: index as u32,
                tx_hash: B256::from(U256::from(100 + index as u64)),
                ..Default::default()
            })
            .collect();

        let mut state_commit = StateCommit {
            key: CommitKey(block_number, 0, B256::ZERO),
            change_set: StateChangeset::default(),
            results: Default::default(),
        };

        let commit_data = CommitData {
            proof: ProofData::default(),
            header: BlockHeaderData {
                number: block_number as u32,
                transactions_count: transaction_count,
                ..Default::default()
            },
            transactions,
        };

        db.commit(&mut state_commit, &Some(commit_data)).unwrap();

        // Read back through the same path findBlocks/restore use.
        let commits = db
            .get_commits_by_block_range(block_number, block_number, u64::MAX)
            .unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(
            commits[0].2.len(),
            transaction_count as usize,
            "transactions committed via commit_to_db must be read back by get_commits_by_block_range"
        );
    }

    #[test]
    fn test_commit_rejects_already_committed_block() {
        let db = create_temp_database();
        let block_number = 1u64;

        let make_commit = || {
            (
                StateCommit {
                    key: CommitKey(block_number, 0, B256::ZERO),
                    change_set: StateChangeset::default(),
                    results: Default::default(),
                },
                CommitData {
                    proof: ProofData::default(),
                    header: BlockHeaderData {
                        number: block_number as u32,
                        ..Default::default()
                    },
                    transactions: vec![],
                },
            )
        };

        // First commit of the block succeeds.
        let (mut state_commit, commit_data) = make_commit();
        db.commit(&mut state_commit, &Some(commit_data)).unwrap();

        // Committing the same block number again is rejected gracefully, not asserted.
        let (mut state_commit, commit_data) = make_commit();
        let result = db.commit(&mut state_commit, &Some(commit_data));
        assert!(
            matches!(result, Err(crate::db::Error::State(_))),
            "expected Err(State(block already committed)), got {result:?}"
        );
    }

    #[test]
    fn test_get_receipts() {
        let db = create_temp_database();

        let receipts = db.get_receipts_by_block_number(1).unwrap();
        assert!(receipts.is_empty());

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");

        let (_, receipt) = db.get_receipt(1, hash).unwrap();
        assert_eq!(receipt, None);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            let mut tx_receipts: HashMap<B256, TxReceipt> = Default::default();
            tx_receipts.insert(hash, Default::default());

            db.inner
                .borrow_mut()
                .commits
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&CommitReceipts {
                        tx_receipts,
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        let receipts = db.get_receipts_by_block_number(1).unwrap();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts.get(&hash), Some(&Default::default()));

        let (_, receipt) = db.get_receipt(1, hash).unwrap();
        assert_eq!(receipt, Some(Default::default()));
    }

    #[test]
    fn test_read_receipts() {
        let db = create_temp_database();

        let target_block = 100;
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

            for i in 0..target_block {
                let block_number = (i + 1) as u64;

                let receipts: HashMap<B256, TxReceipt> = [
                    (random_b256(block_number, 0), TxReceipt::default()),
                    (random_b256(block_number, 1), TxReceipt::default()),
                    (random_b256(block_number, 2), TxReceipt::default()),
                    (random_b256(block_number, 3), TxReceipt::default()),
                ]
                .into_iter()
                .collect();

                total_receipts += receipts.len();

                db.inner
                    .borrow_mut()
                    .commits
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&CommitReceipts {
                            tx_receipts: receipts,
                            ..Default::default()
                        }),
                    )
                    .unwrap();
            }
            wtxn.commit().unwrap();
        }

        const LIMIT: u64 = 7;
        let mut offset = 0;

        let mut read_block_number = 0;
        let mut read_receipts = 0;

        loop {
            let (next, items) = db.get_receipts(offset, LIMIT).unwrap();
            for (block_number, receipts) in items {
                read_block_number = block_number;
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

        assert_eq!(read_block_number, target_block);
        assert_eq!(read_receipts, total_receipts);
    }

    #[test]
    fn test_get_receipts_by_block_range() {
        let db = create_temp_database();

        // Empty before anything is written.
        assert!(db.get_receipts_by_block_range(1, 3).unwrap().is_empty());

        // Write blocks 1..=3; block N gets N receipts with distinct hashes.
        {
            let mut wtxn = db.env.write_txn().unwrap();
            let inner = db.inner.borrow();

            for block_number in 1u64..=3 {
                let mut tx_receipts: HashMap<B256, TxReceipt> = Default::default();
                for index in 0..block_number {
                    tx_receipts.insert(
                        B256::from(U256::from(block_number * 100 + index)),
                        Default::default(),
                    );
                }

                inner
                    .commits
                    .put(
                        &mut wtxn,
                        &block_number,
                        &CompactBincode(&CommitReceipts {
                            tx_receipts,
                            ..Default::default()
                        }),
                    )
                    .unwrap();
            }

            wtxn.commit().unwrap();
        }

        // Full range: blocks ascending, receipt count per block matches what was written.
        let receipts = db.get_receipts_by_block_range(1, 3).unwrap();
        assert_eq!(receipts.len(), 3);
        for (index, (block_number, block_receipts)) in receipts.iter().enumerate() {
            assert_eq!(*block_number, (index + 1) as u64);
            assert_eq!(block_receipts.len(), *block_number as usize);
        }

        // Sub-range returns only the requested block.
        let receipts = db.get_receipts_by_block_range(2, 2).unwrap();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].0, 2);
        assert_eq!(receipts[0].1.len(), 2);

        // Range extending past the tip stops at the last available block.
        let receipts = db.get_receipts_by_block_range(2, 99).unwrap();
        assert_eq!(receipts.len(), 2);
        assert_eq!(receipts[0].0, 2);
        assert_eq!(receipts[1].0, 3);
    }

    #[test]
    #[should_panic(expected = "must be <= to_block_number")]
    fn test_get_receipts_by_block_range_panics_when_from_exceeds_to() {
        let db = create_temp_database();
        let _ = db.get_receipts_by_block_range(3, 1);
    }

    #[test]
    fn test_get_legacy_attributes() {
        let db = create_temp_database();

        let address = address!("0000000000000000000000000000000000000001");

        assert_eq!(db.get_legacy_attributes(address).unwrap(), None);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .legacy_attributes
                .put(
                    &mut wtxn,
                    &AddressWrapper(address),
                    &CompactBincode(&LegacyAccountAttributes {
                        legacy_nonce: Some(1234),
                        second_public_key: Some("key".into()),
                        multi_signature: None,
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(
            db.get_legacy_attributes(address).unwrap(),
            Some(LegacyAccountAttributes {
                legacy_nonce: Some(1234),
                second_public_key: Some("key".into()),
                multi_signature: None,
            })
        );
    }

    #[test]
    fn test_is_empty() {
        let db = create_temp_database();

        assert_eq!(db.is_empty().unwrap(), true);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .blocks
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&BlockHeaderData {
                        hash: b256!(
                            "0000000000000000000000000000000000000000000000000000000000000001"
                        ),
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(db.is_empty().unwrap(), false);
    }

    #[test]
    fn test_get_state() {
        let db = create_temp_database();

        assert_eq!(db.get_state().unwrap(), (0, 0));

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .state
                .put(
                    &mut wtxn,
                    &StaticStringWrapper("total_round"),
                    &Bytes::from_iter(999u64.to_le_bytes()),
                )
                .unwrap();

            db.inner
                .borrow_mut()
                .blocks
                .put(
                    &mut wtxn,
                    &255,
                    &CompactBincode(&BlockHeaderData {
                        number: 255,
                        hash: b256!(
                            "0000000000000000000000000000000000000000000000000000000000000001"
                        ),
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(db.get_state().unwrap(), (255, 999));
    }

    #[test]
    fn test_get_block_number_by_hash() {
        let db = create_temp_database();

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");
        assert_eq!(db.get_block_number_by_hash(hash).unwrap(), None);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .blocks_hash_number
                .put(&mut wtxn, &HashWrapper(hash), &10)
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(db.get_block_number_by_hash(hash).unwrap(), Some(10));
    }

    #[test]
    fn test_get_block_header_data() {
        let db = create_temp_database();

        assert_eq!(db.get_block_header_data(1).unwrap(), None);

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");
        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .blocks
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&BlockHeaderData {
                        number: 1,
                        hash,
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(
            db.get_block_header_data(1).unwrap(),
            Some(BlockHeaderData {
                hash,
                number: 1,
                ..Default::default()
            })
        );
    }

    #[test]
    fn test_get_proof_data() {
        let db = create_temp_database();

        assert_eq!(db.get_proof_data(1).unwrap(), None);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .proofs
                .put(
                    &mut wtxn,
                    &1,
                    &CompactBincode(&ProofData {
                        round: 1,
                        validator_set: 1234,
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(
            db.get_proof_data(1).unwrap(),
            Some(ProofData {
                round: 1,
                validator_set: 1234,
                ..Default::default()
            })
        );
    }

    #[test]
    fn test_transaction_key_encode_decode_roundtrip() {
        for (block_number, index) in [(0u64, 0u16), (1, 2), (5, 9999), (u64::MAX, u16::MAX)] {
            let key = TransactionKey::new(block_number, index);
            let encoded = <TransactionKey as BytesEncode>::bytes_encode(&key).unwrap();
            assert_eq!(encoded.len(), 10, "key is 8-byte block + 2-byte index");

            let decoded = <TransactionKey as BytesDecode>::bytes_decode(&encoded).unwrap();
            assert_eq!(decoded, key);
        }
    }

    #[test]
    fn test_transaction_key_orders_by_block_then_index() {
        // The transactions DB relies on byte (memcmp) key order matching numeric
        // (block_number, index) order, so get_commits_by_block_range can scan by block number.
        // Big-endian encoding is what guarantees this (e.g. block 2 sorts before block 10).
        let ascending = [
            TransactionKey::new(0, 0),
            TransactionKey::new(0, 1),
            TransactionKey::new(0, u16::MAX),
            TransactionKey::new(1, 0), // block 1 sorts after every transaction of block 0
            TransactionKey::new(2, 0),
            TransactionKey::new(10, 0), // numeric order, not lexicographic on decimal
            TransactionKey::new(u64::MAX, 0),
            TransactionKey::new(u64::MAX, u16::MAX),
        ];

        for window in ascending.windows(2) {
            let lo = <TransactionKey as BytesEncode>::bytes_encode(&window[0]).unwrap();
            let hi = <TransactionKey as BytesEncode>::bytes_encode(&window[1]).unwrap();
            assert!(lo < hi, "encoded keys must sort by (block, index)");
            // The derived Ord must agree with the on-disk byte order.
            assert!(window[0] < window[1]);
        }
    }

    #[test]
    fn test_transaction_key_token_roundtrip_and_lenient_parse() {
        assert_eq!(TransactionKey::new(5, 2).to_token(), "5-2");

        let key = TransactionKey::new(123, 45);
        assert_eq!(TransactionKey::parse(&key.to_token()), Some(key));

        // Malformed or out-of-range tokens parse to None (treated as "no such transaction").
        assert_eq!(TransactionKey::parse("nope"), None);
        assert_eq!(TransactionKey::parse("-5"), None);
        assert_eq!(TransactionKey::parse("1-2-3"), None);
        assert_eq!(TransactionKey::parse("1-70000"), None); // index exceeds u16::MAX
    }

    #[test]
    fn test_transaction_key_range_bounds_capture_a_block_range() {
        // Mirrors the scan bounds get_commits_by_block_range builds for [from, to].
        let from = TransactionKey::new(5, 0);
        let to = TransactionKey::new(7, u16::MAX);

        for block in 5..=7u64 {
            for index in [0u16, 1, 1000, u16::MAX] {
                let key = TransactionKey::new(block, index);
                assert!(
                    key >= from && key <= to,
                    "{block}-{index} should be within range"
                );
            }
        }

        // The neighbouring blocks fall outside the range on each side.
        assert!(TransactionKey::new(4, u16::MAX) < from);
        assert!(TransactionKey::new(8, 0) > to);
    }

    #[test]
    fn test_get_transaction_data() {
        let db = create_temp_database();

        // Lookups go through the "<block>-<index>" token; before anything is written it is absent,
        // and malformed/out-of-range tokens resolve to None rather than erroring.
        assert_eq!(db.get_transaction_data("1-0".into()).unwrap(), None);
        assert_eq!(db.get_transaction_data("not-a-key".into()).unwrap(), None);
        assert_eq!(db.get_transaction_data("1-70000".into()).unwrap(), None);

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .transactions
                .put(
                    &mut wtxn,
                    &TransactionKey::new(1, 0),
                    &CompactBincode(&TransactionData {
                        tx_hash: hash,
                        ..Default::default()
                    }),
                )
                .unwrap();

            wtxn.commit().unwrap();
        }

        assert_eq!(
            db.get_transaction_data("1-0".into()).unwrap(),
            Some(TransactionData {
                tx_hash: hash,
                ..Default::default()
            })
        );
    }

    #[test]
    fn test_get_transaction_hash_by_hash() {
        let db = create_temp_database();

        let hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");

        assert_eq!(db.get_transaction_key_by_hash(hash).unwrap(), None);

        {
            let mut wtxn = db.env.write_txn().unwrap();

            db.inner
                .borrow_mut()
                .transactions_hash_key
                .put(&mut wtxn, &HashWrapper(hash), &TransactionKey::new(1, 0))
                .unwrap();

            wtxn.commit().unwrap();
        }

        // The stored typed key is returned to the napi boundary as its "<block>-<index>" token.
        assert_eq!(
            db.get_transaction_key_by_hash(hash).unwrap(),
            Some("1-0".to_string())
        );
    }

    #[test]
    fn test_commit() {
        let db = create_temp_database_opts(|opts| {
            opts.history_size = Some(8);
        });

        let block_hash = b256!("0000000000000000000000000000000000000000000000000000000000000001");
        let key = CommitKey(1, 0, block_hash);

        let account1 = address!("0000000000000000000000000000000000000001");
        let account2 = address!("0000000000000000000000000000000000000002");

        let mut legacy_attributes: BTreeMap<Address, LegacyAccountAttributes> = Default::default();
        legacy_attributes.insert(
            account1,
            LegacyAccountAttributes {
                legacy_nonce: Some(2),
                ..Default::default()
            },
        );
        legacy_attributes.insert(
            account2,
            LegacyAccountAttributes {
                legacy_nonce: Some(9),
                ..Default::default()
            },
        );

        let mut legacy_cold_wallets: BTreeMap<LegacyAddress, LegacyColdWallet> = Default::default();
        let legacy_addresses = [
            "DBYyh2vXcigrJGUHfvmYxVxEqeH7vomw6x",
            "D5KU9KrMYXdkEsRbv4y8hvetGbsJwf9z3P",
            "DJA2sqCbnmR63sD8doGrXrK3fCiqcA4GUw",
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt",
        ];

        for (index, legacy) in legacy_addresses.iter().enumerate() {
            let legacy_address = (*legacy).try_into().unwrap();

            legacy_cold_wallets.insert(
                legacy_address,
                LegacyColdWallet {
                    address: legacy_address,
                    balance: U256::from(index as u64),
                    ..Default::default()
                },
            );
        }

        let mut merged_legacy_cold_wallets: BTreeMap<Address, (B256, LegacyAddress)> =
            Default::default();
        merged_legacy_cold_wallets.insert(
            account1,
            (
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                "DBYyh2vXcigrJGUHfvmYxVxEqeH7vomw6x".try_into().unwrap(),
            ),
        );

        let mut results: BTreeMap<B256, (ExecutionResult, u64)> = Default::default();
        results.insert(
            b256!("1000000000000000000000000000000000000000000000000000000000000000"),
            (
                ExecutionResult::Success {
                    reason: SuccessReason::Stop,
                    gas: ResultGas::default(),
                    logs: Default::default(),
                    output: revm::context::result::Output::Call(Default::default()),
                },
                1234,
            ),
        );

        let mut state = StateCommit {
            key,
            change_set: StateChangeset {
                accounts: vec![
                    (
                        account1,
                        Some(AccountInfo {
                            balance: U256::from(1),
                            nonce: 1,
                            ..Default::default()
                        }),
                    ),
                    (account2, None),
                ],
                storage: vec![
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000003"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::from(2)))],
                        ..Default::default()
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000004"),
                        storage: vec![],
                        wipe_storage: true,
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000003"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::from(2)))],
                        wipe_storage: true,
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000004"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::from(2)))],
                        ..Default::default()
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000004"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::ZERO))],
                        ..Default::default()
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000005"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::from(2)))],
                        ..Default::default()
                    },
                    StorageChangeset {
                        address: address!("0000000000000000000000000000000000000005"),
                        storage: vec![(U256::from(1), StorageSlot::new(U256::from(2)))],
                        ..Default::default()
                    },
                ],
                contracts: vec![(
                    b256!("1000000000000000000000000000000000000000000000000000000000000000"),
                    Bytecode::new_legacy(Bytes(Bytes::from_static(&[1, 2, 3, 4]).into())),
                )],
                legacy_attributes,
                legacy_cold_wallets,
                merged_legacy_cold_wallets,
            },
            results,
        };
        let data = CommitData {
            transactions: vec![TransactionData::default()],
            ..Default::default()
        };

        db.commit(&mut state, &Some(data)).unwrap();
    }

    fn create_temp_database() -> PersistentDB {
        let db = create_temp_database_opts(|_| {});
        db
    }

    fn create_temp_database_opts<F>(callback: F) -> PersistentDB
    where
        F: FnOnce(&mut PersistentDBOptions),
    {
        let path = tempfile::Builder::new()
            .prefix("evm.mdb")
            .tempdir()
            .unwrap();

        let mut opts = PersistentDBOptions::new(path.path().to_path_buf());
        callback(&mut opts);

        let db = PersistentDB::new(opts).expect("database");
        db
    }
}
