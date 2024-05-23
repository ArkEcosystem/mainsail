use std::{borrow::Cow, cell::RefCell, convert::Infallible, path::PathBuf};

use heed::EnvOpenOptions;
use rayon::slice::ParallelSliceMut;
use revm::{primitives::*, CacheState, Database, DatabaseRef, TransitionState};

use crate::state_changes;

#[derive(Debug)]
struct AddressWrapper(Address);
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
struct ContractWrapper(B256);
impl heed::BytesEncode<'_> for ContractWrapper {
    type EItem = ContractWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

type HeedHeight = heed::types::U64<heed::byteorder::LittleEndian>;
type HeedRound = heed::types::U64<heed::byteorder::LittleEndian>;
type StorageEntry = (U256, U256);

struct InnerStorage {
    accounts: heed::Database<AddressWrapper, heed::types::SerdeJson<AccountInfo>>,
    commits: heed::Database<HeedHeight, HeedRound>,
    contracts: heed::Database<ContractWrapper, heed::types::SerdeJson<Bytecode>>,
    storage: heed::Database<AddressWrapper, heed::types::SerdeJson<StorageEntry>>,
}

// A (height, round) pair used to associate state with a processable unit.
#[derive(Hash, PartialEq, Eq, Debug, Default, Clone, Copy)]
pub struct CommitKey(pub u64, pub u64);

pub struct PendingCommit {
    pub key: CommitKey,
    pub cache: CacheState,
    pub transitions: TransitionState,
}

pub struct PersistentDB {
    env: heed::Env,
    inner: RefCell<InnerStorage>,
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("IO error")]
    IO(#[from] std::io::Error),
    #[error("heed error")]
    Heed(#[from] heed::Error),
    #[error("infallible error")]
    Infallible(#[from] Infallible),
}

impl PersistentDB {
    pub fn new(path: PathBuf) -> Result<Self, Error> {
        std::fs::create_dir_all(&path)?;

        let mut env_builder = EnvOpenOptions::new();
        env_builder.max_dbs(4);
        env_builder.map_size(5 * 1024 * 1024 * 1024); // TODO: dynamically resize

        let env = unsafe { env_builder.open(path) }?;

        let tx_env = env.clone();
        let mut wtxn = tx_env.write_txn()?;

        let accounts = env.create_database::<AddressWrapper, heed::types::SerdeJson<AccountInfo>>(
            &mut wtxn,
            Some("accounts"),
        )?;
        let commits = env.create_database::<HeedHeight, HeedRound>(&mut wtxn, Some("commits"))?;
        let contracts = env.create_database::<ContractWrapper, heed::types::SerdeJson<Bytecode>>(
            &mut wtxn,
            Some("contracts"),
        )?;

        let storage = env
            .database_options()
            .types::<AddressWrapper, heed::types::SerdeJson<StorageEntry>>()
            .name("storage")
            .flags(heed::DatabaseFlags::DUP_SORT)
            .create(&mut wtxn)?;

        wtxn.commit()?;

        Ok(Self {
            env,
            inner: RefCell::new(InnerStorage {
                accounts,
                commits,
                contracts,
                storage,
            }),
        })
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

    fn block_hash(&mut self, number: U256) -> Result<B256, Self::Error> {
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
            None => AccountInfo::default(),
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

        let dups = inner
            .storage
            .get_duplicates(&txn, &AddressWrapper(address))?;

        if let Some(mut dups) = dups {
            while let Some(next) = dups.next() {
                let (_, value) = next?;

                if value.0 != index {
                    continue;
                }

                return Ok(value.1);
            }
        }

        Ok(U256::ZERO)
    }

    fn block_hash_ref(&self, _number: U256) -> Result<B256, Self::Error> {
        todo!()
    }
}

impl PersistentDB {
    pub fn commit(&self, pending_commit: PendingCommit) -> Result<(), Error> {
        let PendingCommit {
            key,
            cache,
            transitions,
        } = pending_commit;

        let mut state_builder = revm::State::builder().with_cached_prestate(cache).build();

        state_builder.transition_state = Some(transitions);
        state_builder
            .merge_transitions(revm::db::states::bundle_state::BundleRetention::PlainState);

        let bundle = state_builder.take_bundle();

        assert!(!self.is_height_committed(key.0));

        let mut rwtxn = self.env.write_txn()?;
        let inner = self.inner.borrow_mut();

        let apply_changes = |rwtxn: &mut heed::RwTxn| -> Result<(), Error> {
            let state_changes = state_changes::bundle_into_change_set(bundle);

            let state_changes::StateChangeset {
                mut accounts,
                mut storage,
                mut contracts,
            } = state_changes;

            accounts.par_sort_by_key(|a| a.0);
            contracts.par_sort_by_key(|a| a.0);
            storage.par_sort_by_key(|a| a.address);

            // Update accounts
            for (address, account) in accounts.into_iter() {
                let address = AddressWrapper(address);

                if let Some(account) = account {
                    inner.accounts.put(rwtxn, &address, &account)?;
                } else {
                    inner.accounts.delete(rwtxn, &address)?;
                }
            }
            // Update contracts
            for (hash, bytecode) in contracts.into_iter() {
                inner
                    .contracts
                    .put(rwtxn, &ContractWrapper(hash), &bytecode)?;
            }

            // Update storage
            for state_changes::StorageChangeset {
                address,
                wipe_storage,
                mut storage,
            } in storage.into_iter()
            {
                let address = AddressWrapper(address);
                if wipe_storage {
                    // wipe any existing storage for address
                    inner.storage.delete(rwtxn, &address)?;
                }

                storage.par_sort_unstable_by_key(|a| a.0);

                for value in storage
                    .into_iter()
                    .filter(|v| v.1.present_value() != U256::ZERO)
                {
                    // delete original value at index (if any) then replace it
                    inner.storage.delete_one_duplicate(
                        rwtxn,
                        &address,
                        &(value.0, value.1.original_value()),
                    )?;

                    inner
                        .storage
                        .put(rwtxn, &address, &(value.0, value.1.present_value()))?;
                }
            }

            // Finalize commit
            inner.commits.put(rwtxn, &key.0, &key.1)?;

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
}

impl PendingCommit {
    pub fn new(key: CommitKey) -> Self {
        Self {
            key,
            cache: Default::default(),
            transitions: Default::default(),
        }
    }
}

#[test]
fn test_open_db() {
    let tmp = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    assert!(PersistentDB::new(tmp.path().to_path_buf()).is_ok());
}

#[test]
fn test_commit_changes() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db = PersistentDB::new(path.path().to_path_buf()).expect("database");

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
    let mut changes = HashMap::new();

    let mut account = Account::new_not_existing();
    account.info.balance = U256::from(100);
    account.status = AccountStatus::Touched;

    changes.insert(address, account);
    let result = db.commit(0, 0, vec![changes]);
    assert!(result.is_ok());

    // 3) Assert updated balance
    let account = db.basic(address).expect("works").expect("account info");
    assert_eq!(account.balance, U256::from(100));
}
