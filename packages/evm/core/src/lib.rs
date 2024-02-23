use revm::{
    db::{CacheDB, EmptyDB},
    Evm, InMemoryDB,
};

pub mod constants;

pub type EvmInstance = Evm<'static, (), InMemoryDB>;

pub fn create_evm_instance() -> EvmInstance {
    let db = CacheDB::new(EmptyDB::default());

    // TODO
    // seed_db(&mut db);

    let evm = Evm::builder()
        .with_db(db)
        .modify_env(|_env| {
            // Configure EVM env defaults
        })
        .build();

    evm
}
