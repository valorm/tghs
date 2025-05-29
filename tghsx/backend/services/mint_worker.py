import time
import os
import json
from web3 import Web3
from supabase import create_client
from dotenv import load_dotenv
from backend.utils.constants import RPC_URL, TOKEN_ADDRESS, TOKEN_ABI, PRIVATE_KEY, VAULT_ADDRESS

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Web3 setup
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
token = w3.eth.contract(
    address=Web3.to_checksum_address(TOKEN_ADDRESS),
    abi=TOKEN_ABI
)

# Load Vault ABI from file
def load_vault_abi():
    abi_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'abi', 'CollateralVault.json'))
    try:
        with open(abi_path, 'r') as f:
            vault_abi = json.load(f)
        return vault_abi["abi"]
    except FileNotFoundError:
        print(f"❌ Vault ABI file not found at {abi_path}")
        raise
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON in Vault ABI file at {abi_path}")
        raise

# Initialize Vault contract
try:
    vault_abi = load_vault_abi()
    vault = w3.eth.contract(
        address=Web3.to_checksum_address(VAULT_ADDRESS),
        abi=vault_abi
    )
    print(f"✅ Vault contract initialized at {VAULT_ADDRESS}")
except Exception as e:
    print(f"❌ Failed to initialize vault contract: {e}")
    exit(1)

def verify_collateral_ratio(wallet, mint_amount):
    """Verify user has at least 150% collateral coverage for requested mint"""
    try:
        # Get collateral values in GHS (18 decimals)
        eth_value = vault.functions.getETHValueInGHS(wallet).call()
        usdt_value = vault.functions.getUSDTValueInGHS(wallet).call()
        total_collateral = eth_value + usdt_value
        
        # Get current token balance
        current_balance = token.functions.balanceOf(wallet).call()
        
        # Calculate required collateral: (current_balance + mint_amount) * 1.5
        required_collateral = (current_balance + mint_amount) * 3 // 2  # 1.5 = 3/2
        
        print(f"🔍 Collateral check for {wallet}:")
        print(f"  - Current collateral: {total_collateral / 1e18:.2f} GHS")
        print(f"  - Current balance: {current_balance / 1e18:.2f} tGHSX")
        print(f"  - Mint requested: {mint_amount / 1e18:.2f} tGHSX")
        print(f"  - Required collateral: {required_collateral / 1e18:.2f} GHS")
        
        # Return True if collateral >= 150% of (current + new) tokens
        return total_collateral >= required_collateral
        
    except Exception as e:
        print(f"⚠️ Collateral verification failed: {e}")
        return False

def run_minter():
    print("🟢 Mint Worker Started")
    print(f"🔑 Operator: {account.address}")
    print(f"🏦 Token: {TOKEN_ADDRESS}")
    print(f"🔒 Vault: {VAULT_ADDRESS}")

    while True:
        try:
            # Fetch pending mint requests
            res = supabase.table("mint_requests") \
                          .select("*") \
                          .eq("status", "pending") \
                          .execute()
            requests = res.data or []
            print(f"🧾 Found {len(requests)} mint request(s).")

            for req in requests:
                req_id = req["id"]
                raw_wallet = req["wallet"]
                # Convert GHS amount to token smallest unit (18 decimals)
                amount = int(float(req["amount"]) * 1e18)

                # Validate wallet address
                try:
                    wallet = Web3.to_checksum_address(raw_wallet)
                except Exception as ex:
                    print(f"⚠️ Skipping invalid wallet '{raw_wallet}': {ex}")
                    supabase.table("mint_requests") \
                            .update({"status": "failed", "error": "invalid_wallet"}) \
                            .eq("id", req_id) \
                            .execute()
                    continue

                # Verify collateral ratio
                if not verify_collateral_ratio(wallet, amount):
                    print(f"⛔ Insufficient collateral for {wallet}")
                    supabase.table("mint_requests") \
                            .update({"status": "failed", "error": "insufficient_collateral"}) \
                            .eq("id", req_id) \
                            .execute()
                    continue

                # Build and sign transaction
                try:
                    tx = token.functions.mint(wallet, amount).build_transaction({
                        "from": account.address,
                        "nonce": w3.eth.get_transaction_count(account.address),
                        "gas": 300_000,
                        "gasPrice": w3.eth.gas_price
                    })
                    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                    raw_tx = signed.raw_transaction
                    tx_hash = w3.eth.send_raw_transaction(raw_tx)
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

                    print(f"✅ Minted {req['amount']} tGHSX to {wallet} — tx: {tx_hash.hex()}")

                    # Mark request as completed
                    supabase.table("mint_requests") \
                            .update({"status": "completed", "tx_hash": tx_hash.hex()}) \
                            .eq("id", req_id) \
                            .execute()
                except Exception as e:
                    print(f"⚠️ Minting failed: {e}")
                    supabase.table("mint_requests") \
                            .update({"status": "failed", "error": str(e)}) \
                            .eq("id", req_id) \
                            .execute()

        except Exception as e:
            print(f"❌ Worker error: {e}")

        time.sleep(10)

if __name__ == "__main__":
    run_minter()