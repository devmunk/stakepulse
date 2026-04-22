#![no_std]
mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec, token,
    log,
};

// ─── Storage Keys ──────────────────────────────────────────────
const ADMIN: Symbol = symbol_short!("ADMIN");
const PRED_COUNT: Symbol = symbol_short!("PRED_CNT");

// ─── Data Types ────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct Prediction {
    pub id: u64,
    pub question: String,
    pub options: Vec<String>,
    pub end_time: u64,
    pub total_pool: i128,
    pub resolved: bool,
    pub winning_option: u32,
    pub creator: Address,
}

#[contracttype]
pub enum DataKey {
    Prediction(u64),
    OptionStake(u64, u32),       // prediction_id, option_index
    UserStake(u64, Address),      // prediction_id, user
    UserOption(u64, Address),     // prediction_id, user → option index
    UserTotalReward(Address),
    Claimed(u64, Address),
}

// ─── Contract ──────────────────────────────────────────────────
#[contract]
pub struct StakePulse;

#[contractimpl]
impl StakePulse {

    // ── Initialize ────────────────────────────────────────────
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&PRED_COUNT, &0u64);
        env.storage().instance().extend_ttl(100_000, 100_000);
    }

    // ── Create Prediction ─────────────────────────────────────
    pub fn create_prediction(
        env: Env,
        creator: Address,
        question: String,
        options: Vec<String>,
        end_time: u64,
    ) -> u64 {
        creator.require_auth();
        let count = options.len();
        if count < 2 || count > 4 {
            panic!("options must be 2-4");
        }
        if end_time <= env.ledger().timestamp() {
            panic!("end_time must be in the future");
        }

        let mut pred_count: u64 = env
            .storage().instance().get(&PRED_COUNT).unwrap_or(0u64);
        let id = pred_count;
        pred_count += 1;

        let pred = Prediction {
            id,
            question,
            options,
            end_time,
            total_pool: 0,
            resolved: false,
            winning_option: 999, 
            creator: creator.clone(),
        };

        env.storage().persistent().set(&DataKey::Prediction(id), &pred);
        env.storage().instance().set(&PRED_COUNT, &pred_count);
        env.storage().instance().extend_ttl(100_000, 100_000);

        log!(&env, "Prediction created: {}", id);
        id
    }

    // ── Stake ─────────────────────────────────────────────────
    pub fn stake(
        env: Env,
        user: Address,
        prediction_id: u64,
        option_index: u32,
        amount: i128,
        token_address: Address,
    ) {
        user.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        
        let mut pred: Prediction = env
            .storage().persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("prediction not found");

        if pred.resolved {
            panic!("prediction already resolved");
        }
        if env.ledger().timestamp() >= pred.end_time {
            panic!("staking period ended");
        }
        if option_index >= pred.options.len() as u32 {
            panic!("invalid option");
        }

        // one stake per user per prediction
        let user_stake_key = DataKey::UserStake(prediction_id, user.clone());
        if env.storage().persistent().has(&user_stake_key) {
            panic!("already staked on this prediction");
        }

        // transfer tokens from user to contract
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        // update option stake
        let opt_key = DataKey::OptionStake(prediction_id, option_index);
        let prev_opt_stake: i128 = env
            .storage().persistent().get(&opt_key).unwrap_or(0i128);
        env.storage().persistent().set(&opt_key, &(prev_opt_stake + amount));

        // update prediction pool
        pred.total_pool += amount;
        env.storage().persistent().set(&DataKey::Prediction(prediction_id), &pred);

        // store user stake and option
        env.storage().persistent().set(&user_stake_key, &amount);
        env.storage().persistent().set(
            &DataKey::UserOption(prediction_id, user.clone()),
            &option_index,
        );

        // extend TTL
        env.storage().persistent().extend_ttl(&DataKey::Prediction(prediction_id), 100_000, 100_000);
        env.storage().persistent().extend_ttl(&user_stake_key, 100_000, 100_000);
    }

    // ── Resolve Prediction ────────────────────────────────────
    pub fn resolve_prediction(
    env: Env,
    caller: Address,
    prediction_id: u64,
    winning_option: u32,
) {
    caller.require_auth();

    let mut pred: Prediction = env
        .storage().persistent()
        .get(&DataKey::Prediction(prediction_id))
        .expect("prediction not found");

    let admin: Address = env.storage().instance().get(&ADMIN).unwrap();

    if caller != admin && caller != pred.creator {
        panic!("unauthorized");
    }

    
    if pred.resolved {
        panic!("already resolved");
    }

    if env.ledger().timestamp() < pred.end_time {
        panic!("prediction not ended yet");
    }

    if winning_option >= pred.options.len() as u32 {
        panic!("invalid winning option");
    }

    pred.resolved = true;
    pred.winning_option = winning_option;

    env.storage().persistent().set(&DataKey::Prediction(prediction_id), &pred);
}

    // ── Claim Reward ──────────────────────────────────────────
    pub fn claim_reward(
        env: Env,
        user: Address,
        prediction_id: u64,
        token_address: Address,
    ) {
        user.require_auth();

        let pred: Prediction = env
            .storage().persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("prediction not found");

        if !pred.resolved {
            panic!("prediction not resolved yet");
        }

        let claimed_key = DataKey::Claimed(prediction_id, user.clone());
        if env.storage().persistent().has(&claimed_key) {
            panic!("already claimed");
        }

        let user_option_key = DataKey::UserOption(prediction_id, user.clone());
        let user_option: u32 = env
            .storage().persistent()
            .get(&user_option_key)
            .expect("user did not stake");

        if user_option != pred.winning_option {
            panic!("you did not pick the winning option");
        }

        let user_stake_key = DataKey::UserStake(prediction_id, user.clone());
        let user_stake: i128 = env
            .storage().persistent()
            .get(&user_stake_key)
            .expect("no stake found");

        let winning_opt_stake: i128 = env
            .storage().persistent()
            .get(&DataKey::OptionStake(prediction_id, pred.winning_option))
            .unwrap_or(0i128);

        if winning_opt_stake == 0 {
            panic!("zero winning stake");
        }

        // Reward = (user_stake / winning_stake) * total_pool
        let reward: i128 = (user_stake * pred.total_pool) / winning_opt_stake;

        // mark claimed
        env.storage().persistent().set(&claimed_key, &true);

        // transfer reward
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &user, &reward);

        // update leaderboard total
        let reward_key = DataKey::UserTotalReward(user.clone());
        let prev_reward: i128 = env.storage().persistent().get(&reward_key).unwrap_or(0i128);
        env.storage().persistent().set(&reward_key, &(prev_reward + reward));
    }

    // ── Read: Get All Prediction IDs ──────────────────────────
    pub fn get_predictions(env: Env) -> Vec<u64> {
        let count: u64 = env.storage().instance().get(&PRED_COUNT).unwrap_or(0u64);
        let mut ids = Vec::new(&env);
        for i in 0..count {
            ids.push_back(i);
        }
        ids
    }

    // ── Read: Get Prediction Details ──────────────────────────
    pub fn get_prediction_details(env: Env, prediction_id: u64) -> Prediction {
        env.storage().persistent()
            .get(&DataKey::Prediction(prediction_id))
            .expect("not found")
    }

    // ── Read: Get Option Stake ────────────────────────────────
    pub fn get_option_stake(env: Env, prediction_id: u64, option_index: u32) -> i128 {
        env.storage().persistent()
            .get(&DataKey::OptionStake(prediction_id, option_index))
            .unwrap_or(0i128)
    }

    // ── Read: Get User Stake ──────────────────────────────────
    pub fn get_user_stake(env: Env, prediction_id: u64, user: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::UserStake(prediction_id, user))
            .unwrap_or(0i128)
    }

    // ── Read: Get User Option ─────────────────────────────────
    pub fn get_user_option(env: Env, prediction_id: u64, user: Address) -> i32 {
        match env.storage().persistent()
            .get::<DataKey, u32>(&DataKey::UserOption(prediction_id, user)) {
            Some(v) => v as i32,
            None => -1i32,
        }
    }

    // ── Read: Get User Total Reward ───────────────────────────
    pub fn get_user_total_reward(env: Env, user: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::UserTotalReward(user))
            .unwrap_or(0i128)
    }

    // ── Read: Has Claimed ─────────────────────────────────────
    pub fn has_claimed(env: Env, prediction_id: u64, user: Address) -> bool {
        env.storage().persistent()
            .has(&DataKey::Claimed(prediction_id, user))
    }

    // ── Read: Prediction Count ────────────────────────────────
    pub fn get_prediction_count(env: Env) -> u64 {
        env.storage().instance().get(&PRED_COUNT).unwrap_or(0u64)
    }
}
