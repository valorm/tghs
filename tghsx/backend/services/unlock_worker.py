import time
import os
from web3 import Web3
from supabase import create_client
from dotenv import load_dotenv
from backend.utils.constants import (
    RPC_URL, PRIVATE_KEY, VAULT_ADDRESS, TOKEN_ABI, VAULT_ABI
)
from backend.utils.supabase_client import supabase

# Load .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Init Web3 + contracts
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
vault = w3.eth.contract(
    address=Web3.to_checksum_address(VAULT_ADDRESS),
    abi=VAULT_ABI
)

def run_unlocker():
    print("🔓 Unlock Worker Started")

    while True:
        try:
            res = supabase.table("unlock_requests") \
                          .select("*") \
                          .eq("status", "pending") \
                          .execute()
            requests = res.data or []
            print(f"🧾 Found {len(requests)} unlock request(s).")

            for req in requests:
                req_id = req["id"]
                raw_wallet = req["wallet"]
                amount = int(float(req["amount"]) * 1e18)
                asset = req["asset"]

                # Validate wallet address
                try:
                    wallet = Web3.to_checksum_address(raw_wallet)
                except Exception as e:
                    print(f"⚠️ Invalid wallet: {raw_wallet}")
                    supabase.table("unlock_requests").update({
                        "status": "failed", "error": "invalid_wallet"
                    }).eq("id", req_id).execute()
                    continue

                # Build unlock tx
                if asset == "ETH":
                    tx = vault.functions.unlockETH(wallet, amount).build_transaction({
                        "from": account.address,
                        "nonce": w3.eth.get_transaction_count(account.address),
                        "gas": 300000,
                        "gasPrice": w3.eth.gas_price
                    })
                elif asset == "USDT":
                    tx = vault.functions.unlockUSDT(wallet, amount).build_transaction({
                        "from": account.address,
                        "nonce": w3.eth.get_transaction_count(account.address),
                        "gas": 300000,
                        "gasPrice": w3.eth.gas_price
                    })
                else:
                    print(f"❌ Unsupported asset: {asset}")
                    supabase.table("unlock_requests").update({
                        "status": "failed", "error": "invalid_asset"
                    }).eq("id", req_id).execute()
                    continue

                signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

                print(f"✅ Unlocked {req['amount']} GHS as {asset} to {wallet} — tx: {tx_hash.hex()}")

                # Mark completed
                supabase.table("unlock_requests").update({
                    "status": "completed",
                    "tx_hash": tx_hash.hex()
                }).eq("id", req_id).execute()

        except Exception as e:
            print(f"❌ Worker error: {e}")

        time.sleep(10)

if __name__ == "__main__":
    run_unlocker()
