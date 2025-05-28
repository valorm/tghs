import os
from web3 import Web3
from supabase import create_client
from dotenv import load_dotenv
from backend.utils.constants import RPC_URL

# Load environment
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
PRIVATE_KEY  = os.getenv("MINTER_PRIVATE_KEY")
TOKEN_ADDRESS = os.getenv("TOKEN_ADDRESS")

if not all([SUPABASE_URL, SUPABASE_KEY, PRIVATE_KEY, TOKEN_ADDRESS]):
    raise Exception("Missing env vars for mint worker (SUPABASE_URL, SUPABASE_KEY, MINTER_PRIVATE_KEY, TOKEN_ADDRESS)")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# tGHSX token details
TOKEN_ABI = [{
    "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]

def run_minter():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = w3.eth.account.from_key(PRIVATE_KEY)
    
    # Convert to checksum address to avoid ENS issues
    token_address = Web3.to_checksum_address(TOKEN_ADDRESS)
    token = w3.eth.contract(address=token_address, abi=TOKEN_ABI)

    # Fetch up to 10 pending mint requests
    resp = supabase.table("mint_queue").select("*").limit(10).execute()
    entries = resp.data or []
    print(f"Found {len(entries)} mint request(s).")

    for entry in entries:
        wallet = entry["wallet"]
        amount_wei = int(float(entry["amount"]) * 1e18)

        try:
            # Validate wallet address
            if not wallet or len(wallet) != 42 or not wallet.startswith('0x'):
                print(f"❌ Invalid wallet address: {wallet}")
                continue
                
            # Convert wallet to checksum address
            wallet = Web3.to_checksum_address(wallet)

            # Build the transaction
            tx = token.functions.mint(wallet, amount_wei).build_transaction({
                "from": account.address,
                "nonce": w3.eth.get_transaction_count(account.address),
                "gas": 200000,
                "gasPrice": w3.eth.gas_price
            })

            # Sign & send (fixed for newer web3.py versions)
            signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()

            # Log mint event
            supabase.table("mint_events").insert({
                "wallet": wallet,
                "amount": entry["amount"],
                "tx_hash": tx_hash
            }).execute()

            # Remove from queue
            supabase.table("mint_queue").delete().eq("id", entry["id"]).execute()

            print(f"✅ Minted {entry['amount']} to {wallet} — tx: {tx_hash}")

        except Exception as e:
            print(f"❌ Failed to mint {entry['amount']} to {wallet}: {e}")

if __name__ == "__main__":
    run_minter()