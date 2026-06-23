#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, symbol_short,
};

// ─── Data types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum RequestStatus {
    Pending,
    Paid,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct PaymentRequest {
    pub id: u64,
    pub from: Address,    // who is owed
    pub to: Address,      // who must pay
    pub amount: i128,     // in stroops (1 XLM = 10_000_000)
    pub memo: String,
    pub status: RequestStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    RequestCount,
    Request(u64),
    UserRequests(Address),  // requests where user is the "to"
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct PaymentRequestContract;

#[contractimpl]
impl PaymentRequestContract {

    /// Create a new payment request (creditor calls this)
    pub fn create_request(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        memo: String,
    ) -> u64 {
        from.require_auth();

        // Validate amount > 0
        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Auto-increment ID
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0u64)
            + 1;

        let request = PaymentRequest {
            id,
            from: from.clone(),
            to: to.clone(),
            amount,
            memo: memo.clone(),
            status: RequestStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        // Store the request
        env.storage()
            .persistent()
            .set(&DataKey::Request(id), &request);

        // Update count
        env.storage()
            .instance()
            .set(&DataKey::RequestCount, &id);

        // Emit event
        env.events().publish(
            (symbol_short!("request"), symbol_short!("created")),
            (id, from, to, amount),
        );

        id
    }

    /// Mark a request as paid (debtor calls this after sending XLM)
    pub fn mark_paid(env: Env, caller: Address, request_id: u64) {
        caller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        // Only the designated payer can mark as paid
        if request.to != caller {
            panic!("only the designated payer can mark as paid");
        }

        request.status = RequestStatus::Paid;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);

        // Emit event
        env.events().publish(
            (symbol_short!("request"), symbol_short!("paid")),
            (request_id, caller, request.amount),
        );
    }

    /// Reject a request
    pub fn reject_request(env: Env, caller: Address, request_id: u64) {
        caller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if request.to != caller {
            panic!("only the designated payer can reject");
        }

        request.status = RequestStatus::Rejected;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);

        env.events().publish(
            (symbol_short!("request"), symbol_short!("rejected")),
            (request_id, caller),
        );
    }

    /// Read a single request by ID
    pub fn get_request(env: Env, request_id: u64) -> Option<PaymentRequest> {
        env.storage()
            .persistent()
            .get(&DataKey::Request(request_id))
    }

    /// Get total request count
    pub fn get_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0)
    }
}
