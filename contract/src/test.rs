#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Vec,
};

// Helper to create a test env with a token
fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register_contract(None, StakePulse);

    // init
    let client = StakePulseClient::new(&env, &contract_id);
    client.initialize(&admin);

    (env, contract_id, admin, user)
}

fn make_token(env: &Env, admin: &Address, user: &Address) -> Address {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_admin = soroban_sdk::token::StellarAssetClient::new(env, &token_id.address());
    token_admin.mint(user, &1_000_000_000i128);
    token_id.address()
}

fn future_time(env: &Env) -> u64 {
    env.ledger().timestamp() + 3600
}

fn create_options(env: &Env) -> Vec<String> {
    let mut opts = Vec::new(env);
    opts.push_back(String::from_str(env, "Yes"));
    opts.push_back(String::from_str(env, "No"));
    opts
}

// ── Test 1: Staking works correctly ──────────────────────────
#[test]
fn test_staking_works() {
    let (env, contract_id, admin, user) = setup();
    let token = make_token(&env, &admin, &user);
    let client = StakePulseClient::new(&env, &contract_id);

    let pred_id = client.create_prediction(
        &admin,
        &String::from_str(&env, "Will BTC hit 100k?"),
        &create_options(&env),
        &future_time(&env),
    );

    let stake_amount = 100_000_000i128;
    client.stake(&user, &pred_id, &0u32, &stake_amount, &token);

    let user_stake = client.get_user_stake(&pred_id, &user);
    assert_eq!(user_stake, stake_amount, "Stake amount should match");

    let user_option = client.get_user_option(&pred_id, &user);
    assert_eq!(user_option, 0i32, "User option should be 0");

    let opt_stake = client.get_option_stake(&pred_id, &0u32);
    assert_eq!(opt_stake, stake_amount, "Option stake should match");

    let pred = client.get_prediction_details(&pred_id);
    assert_eq!(pred.total_pool, stake_amount, "Pool should equal stake");
}

// ── Test 2: Reward calculation is correct ────────────────────
#[test]
fn test_reward_calculation_correct() {
    let (env, contract_id, admin, user) = setup();
    let user2 = Address::generate(&env);

    let token = make_token(&env, &admin, &user);
    // Mint for user2 separately
    let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&user2, &1_000_000_000i128);

    let client = StakePulseClient::new(&env, &contract_id);

    let pred_id = client.create_prediction(
        &admin,
        &String::from_str(&env, "Will ETH flip BTC?"),
        &create_options(&env),
        &future_time(&env),
    );

    // user stakes 300 on option 0, user2 stakes 100 on option 0
    client.stake(&user, &pred_id, &0u32, &300_000_000i128, &token);
    client.stake(&user2, &pred_id, &0u32, &100_000_000i128, &token);

    // Advance time so prediction expires
    env.ledger().with_mut(|l| {
        l.timestamp += 7200;
    });

    // Resolve with option 0 winning
    client.resolve_prediction(&admin, &pred_id, &0u32);

    let pred = client.get_prediction_details(&pred_id);
    assert!(pred.resolved);
    assert_eq!(pred.total_pool, 400_000_000i128);

    // Claim reward for user
    let token_client = soroban_sdk::token::Client::new(&env, &token);
    let before = token_client.balance(&user);
    client.claim_reward(&user, &pred_id, &token);
    let after = token_client.balance(&user);

    // user had 300/400 of pool → reward = 300/400 * 400 = 300
    assert_eq!(after - before, 300_000_000i128, "Reward should be 300M stroops");
}

// ── Test 3: Cannot stake after expiry ────────────────────────
#[test]
#[should_panic(expected = "staking period ended")]
fn test_cannot_stake_after_expiry() {
    let (env, contract_id, admin, user) = setup();
    let token = make_token(&env, &admin, &user);
    let client = StakePulseClient::new(&env, &contract_id);

    let end_time = env.ledger().timestamp() + 100;
    let pred_id = client.create_prediction(
        &admin,
        &String::from_str(&env, "Expired test?"),
        &create_options(&env),
        &end_time,
    );

    // Advance ledger past end time
    env.ledger().with_mut(|l| {
        l.timestamp = end_time + 10;
    });

    // This should panic
    client.stake(&user, &pred_id, &0u32, &100_000_000i128, &token);
}
