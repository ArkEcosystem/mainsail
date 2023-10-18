create extension if not exists dblink;

-- connect to v3 database
select dblink_connect('v3_db', 'dbname=ark_devnet user=test_db password=test_db');

--
-- create temporary tables from v3 database
--

-- BLOCKS
drop table if exists v3_blocks;
create temp table v3_blocks as
select *
from dblink('v3_db', '
select
    id, version, timestamp, previous_block,
    height, number_of_transactions, total_amount, total_fee,
    reward, payload_length, payload_hash, generator_public_key, block_signature
from ark_devnet.public.blocks
order by height asc
')
         as blocks(id varchar, version smallint, timestamp integer, previous_block varchar,
                   height integer, number_of_transactions integer, total_amount bigint,
                   total_fee bigint, reward bigint, payload_length integer, payload_hash varchar,
                   generator_public_key varchar, block_signature varchar);

-- TRANSACTIONS
drop table if exists v3_transactions;
create temp table v3_transactions as
select *
from dblink('v3_db', '
select
    id, version, block_id, sequence, timestamp, sender_public_key,
    recipient_id, type, vendor_field, amount, fee,
    serialized, type_group, nonce, asset, block_height
from ark_devnet.public.transactions
order by block_height asc, sequence asc
')
         as transactions(id varchar, version smallint, block_id varchar,
                         sequence smallint, timestamp integer, sender_public_key varchar,
                         recipient_id varchar, type smallint, vendor_field bytea, amount bigint,
                         fee bigint, serialized bytea, type_group integer, nonce bigint, asset jsonb,
                         block_height integer);

-- ROUNDS
drop table if exists v3_rounds;
create temp table v3_rounds as
select *
from dblink('v3_db', '
select
    public_key, balance, round
from ark_devnet.public.rounds
order by round asc, balance desc, public_key
')
         as rounds(public_key varchar, balance bigint, round integer);

-- WALLETS
drop table if exists v3_wallets;
create temp table v3_wallets as
select *
from dblink('v3_db', '
select
    address, public_key, balance, nonce, attributes
from ark_devnet.public.wallets
order by balance desc, address
')
         as wallets(address varchar, public_key varchar, balance bigint, nonce bigint, attributes jsonb);

-- truncate mainsail tables
truncate table blocks restart identity;
truncate table transactions restart identity;
truncate table validator_rounds restart identity;
truncate table wallets restart identity;

-- migrate blocks
insert into test_db.public.blocks (id, version, timestamp, previous_block, height, number_of_transactions, total_amount,
                                   total_fee, reward, payload_length, payload_hash, generator_public_key, signature)
select id,
       version,
       (timestamp::bigint) * 1000,                                                     -- must be milliseconds
       coalesce(previous_block,
                '0x0000000000000000000000000000000000000000000000000000000000000000'), -- null block is now a zero hash
       height,
       number_of_transactions,
       total_amount,                                                                   -- TODO: this now includes multi payment amount
       total_fee,
       reward,
       payload_length,
       payload_hash,
       generator_public_key,
       block_signature
from v3_blocks
on conflict (id) do nothing;


-- migrate transactions
insert into test_db.public.transactions (id, version, type, type_group, block_id, block_height, sequence, timestamp,
                                         nonce,
                                         sender_public_key, recipient_id, vendor_field, amount, fee, asset, signature)
select id,
       version,
       type,
       type_group,
       block_id,
       block_height,
       sequence,
       (timestamp::bigint) * 1000, -- must be milliseconds
       nonce,
       sender_public_key,
       recipient_id,
       vendor_field,
       amount,                     -- TODO: this now includes multi payment amount
       fee,
       asset,
       '0'                         -- TODO: v3 has no tx signature column
from v3_transactions
order by block_height, sequence
on conflict (id) do nothing;


-- migrate rounds
insert into test_db.public.validator_rounds (round, round_height, validators)
select round,
       1 + (round * 51) - 51, -- TODO: double check
       jsonb_agg(public_key order by balance desc, public_key asc)::jsonb
from v3_rounds
group by round
order by round asc
on conflict (round) do update
    set round_height = excluded.round_height,
        validators   = excluded.validators;

-- migrate wallets
insert into test_db.public.wallets (address, public_key, balance, nonce, attributes)
select address,
       public_key,
       balance,
       nonce,
       attributes  -- TODO: migrate attributes
from v3_wallets
order by balance desc, address
on conflict (address) do update
    set public_key = excluded.public_key,
        balance    = excluded.balance,
        nonce      = excluded.nonce,
        attributes = excluded.attributes;

--
select (select count(1) from blocks),
       (select count(1) from validator_rounds),
       (select count(1) from transactions),
       (select count(1) from wallets);
