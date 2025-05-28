import time
import os
from web3 import Web3
from supabase import create_client
from dotenv import load_dotenv
from backend.utils.constants import RPC_URL, TOKEN_ADDRESS, TOKEN_ABI, PRIVATE_KEY

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

def run_minter():
    print("🟢 Mint Worker Started")

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
                # convert GHS amount to token smallest unit (18 decimals)
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

                # Build and sign transaction
                tx = token.functions.mint(wallet, amount).build_transaction({
                    "from": account.address,
                    "nonce": w3.eth.get_transaction_count(account.address),
                    "gas": 300_000,
                    "gasPrice": w3.eth.gas_price
                })
                signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                # Use raw_transaction for Web3.py v6
                raw_tx = signed.raw_transaction
                tx_hash = w3.eth.send_raw_transaction(raw_tx)
                receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

                print(f"✅ Minted {req['amount']} GHS to {wallet} — tx: {tx_hash.hex()}")

                # Mark request as completed
                supabase.table("mint_requests") \
                        .update({"status": "completed", "tx_hash": tx_hash.hex()}) \
                        .eq("id", req_id) \
                        .execute()

        except Exception as e:
            print(f"❌ Worker error: {e}")

        time.sleep(10)

if __name__ == "__main__":
    run_minter()
