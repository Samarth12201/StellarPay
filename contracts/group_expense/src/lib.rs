#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, Vec, symbol_short,
};

// ─── Types ────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Member {
    pub address: Address,
    pub name: String,
}

#[contracttype]
#[derive(Clone)]
pub struct Expense {
    pub id: u64,
    pub description: String,
    pub amount: i128,          // in stroops
    pub paid_by: Address,
    pub split_among: Vec<Address>,
    pub timestamp: u64,
    pub settled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Group {
    pub id: u64,
    pub name: String,
    pub members: Vec<Member>,
    pub expense_count: u64,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    GroupCount,
    Group(u64),
    Expense(u64, u64),         // (group_id, expense_id)
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct GroupExpenseContract;

#[contractimpl]
impl GroupExpenseContract {

    /// Create a new group
    pub fn create_group(
        env: Env,
        creator: Address,
        name: String,
        member_addresses: Vec<Address>,
        member_names: Vec<String>,
    ) -> u64 {
        creator.require_auth();

        if member_addresses.len() != member_names.len() {
            panic!("member addresses and names must have equal length");
        }
        if member_addresses.len() < 2 {
            panic!("group must have at least 2 members");
        }

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::GroupCount)
            .unwrap_or(0u64) + 1;

        let mut members = Vec::new(&env);
        for i in 0..member_addresses.len() {
            members.push_back(Member {
                address: member_addresses.get(i).unwrap(),
                name: member_names.get(i).unwrap(),
            });
        }

        let group = Group {
            id,
            name: name.clone(),
            members,
            expense_count: 0,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Group(id), &group);
        env.storage().instance().set(&DataKey::GroupCount, &id);

        env.events().publish(
            (symbol_short!("group"), symbol_short!("created")),
            (id, creator, name),
        );

        id
    }

    /// Add an expense to a group
    pub fn add_expense(
        env: Env,
        caller: Address,
        group_id: u64,
        description: String,
        amount: i128,
        paid_by: Address,
        split_among: Vec<Address>,
    ) -> u64 {
        caller.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        if split_among.len() == 0 {
            panic!("must split among at least one person");
        }

        let mut group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        let expense_id = group.expense_count + 1;
        group.expense_count = expense_id;

        let expense = Expense {
            id: expense_id,
            description: description.clone(),
            amount,
            paid_by: paid_by.clone(),
            split_among: split_among.clone(),
            timestamp: env.ledger().timestamp(),
            settled: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Expense(group_id, expense_id), &expense);
        env.storage()
            .persistent()
            .set(&DataKey::Group(group_id), &group);

        env.events().publish(
            (symbol_short!("expense"), symbol_short!("added")),
            (group_id, expense_id, paid_by, amount),
        );

        expense_id
    }

    /// Mark an expense as settled (called after XLM payments sent)
    pub fn settle_expense(
        env: Env,
        caller: Address,
        group_id: u64,
        expense_id: u64,
    ) {
        caller.require_auth();

        let mut expense: Expense = env
            .storage()
            .persistent()
            .get(&DataKey::Expense(group_id, expense_id))
            .expect("expense not found");

        expense.settled = true;
        env.storage()
            .persistent()
            .set(&DataKey::Expense(group_id, expense_id), &expense);

        env.events().publish(
            (symbol_short!("expense"), symbol_short!("settled")),
            (group_id, expense_id, caller),
        );
    }

    /// Inter-contract call: get group member count for validation
    pub fn get_member_count(env: Env, group_id: u64) -> u32 {
        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");
        group.members.len()
    }

    /// Read a group
    pub fn get_group(env: Env, group_id: u64) -> Option<Group> {
        env.storage().persistent().get(&DataKey::Group(group_id))
    }

    /// Read an expense
    pub fn get_expense(env: Env, group_id: u64, expense_id: u64) -> Option<Expense> {
        env.storage()
            .persistent()
            .get(&DataKey::Expense(group_id, expense_id))
    }

    /// Get group count
    pub fn get_group_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::GroupCount)
            .unwrap_or(0)
    }
}

// ─── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, Env};

    #[test]
    fn test_create_group_success() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, GroupExpenseContract);
        let client = GroupExpenseContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let addresses = vec![&env, alice.clone(), bob.clone()];
        let names = vec![
            &env,
            String::from_str(&env, "Alice"),
            String::from_str(&env, "Bob"),
        ];

        let group_id = client.create_group(
            &creator,
            &String::from_str(&env, "Goa Trip"),
            &addresses,
            &names,
        );

        assert_eq!(group_id, 1);
        let group = client.get_group(&group_id).unwrap();
        assert_eq!(group.expense_count, 0);
        assert_eq!(group.members.len(), 2);
    }

    #[test]
    fn test_add_expense_and_retrieve() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, GroupExpenseContract);
        let client = GroupExpenseContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let group_id = client.create_group(
            &creator,
            &String::from_str(&env, "Trip"),
            &vec![&env, alice.clone(), bob.clone()],
            &vec![
                &env,
                String::from_str(&env, "Alice"),
                String::from_str(&env, "Bob"),
            ],
        );

        let expense_id = client.add_expense(
            &creator,
            &group_id,
            &String::from_str(&env, "Hotel"),
            &1_000_000_000i128,  // 100 XLM
            &alice,
            &vec![&env, alice.clone(), bob.clone()],
        );

        assert_eq!(expense_id, 1);
        let expense = client.get_expense(&group_id, &expense_id).unwrap();
        assert_eq!(expense.amount, 1_000_000_000);
        assert_eq!(expense.settled, false);
    }

    #[test]
    fn test_settle_expense() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, GroupExpenseContract);
        let client = GroupExpenseContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let group_id = client.create_group(
            &creator,
            &String::from_str(&env, "Trip"),
            &vec![&env, alice.clone(), bob.clone()],
            &vec![
                &env,
                String::from_str(&env, "Alice"),
                String::from_str(&env, "Bob"),
            ],
        );

        let expense_id = client.add_expense(
            &creator,
            &group_id,
            &String::from_str(&env, "Dinner"),
            &500_000_000i128,
            &alice,
            &vec![&env, alice.clone(), bob.clone()],
        );

        client.settle_expense(&creator, &group_id, &expense_id);

        let expense = client.get_expense(&group_id, &expense_id).unwrap();
        assert_eq!(expense.settled, true);
    }

    #[test]
    #[should_panic(expected = "group must have at least 2 members")]
    fn test_create_group_too_few_members() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, GroupExpenseContract);
        let client = GroupExpenseContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let alice = Address::generate(&env);

        client.create_group(
            &creator,
            &String::from_str(&env, "Solo"),
            &vec![&env, alice.clone()],
            &vec![&env, String::from_str(&env, "Alice")],
        );
    }

    #[test]
    #[should_panic(expected = "amount must be positive")]
    fn test_add_expense_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, GroupExpenseContract);
        let client = GroupExpenseContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let group_id = client.create_group(
            &creator,
            &String::from_str(&env, "Trip"),
            &vec![&env, alice.clone(), bob.clone()],
            &vec![
                &env,
                String::from_str(&env, "Alice"),
                String::from_str(&env, "Bob"),
            ],
        );

        client.add_expense(
            &creator, &group_id,
            &String::from_str(&env, "Free"), &0i128,
            &alice, &vec![&env, alice.clone(), bob.clone()],
        );
    }
}
