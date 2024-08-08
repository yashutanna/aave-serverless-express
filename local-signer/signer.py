import json
import sys
from web3 import Web3

def sign_transaction(unsigned_tx_json, private_key):
    # Create a Web3 instance (not connected to any provider)
    web3 = Web3()

    # Load the unsigned transaction
    unsigned_tx = json.loads(unsigned_tx_json)

    # Debugging: Print the unsigned transaction to verify its contents
    print("Unsigned Transaction:", unsigned_tx)

    # Ensure the 'gasLimit' field is renamed to 'gas'
    if 'gasLimit' in unsigned_tx:
        unsigned_tx['gas'] = unsigned_tx.pop('gasLimit')

    # Ensure all necessary fields are present in the unsigned transaction
    required_fields = ['nonce', 'gasPrice', 'gas', 'to', 'value', 'data']
    missing_fields = [field for field in required_fields if field not in unsigned_tx]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

    # Convert numeric fields to hexadecimal format
    unsigned_tx['value'] = web3.to_hex(unsigned_tx['value'])
    unsigned_tx['nonce'] = web3.to_hex(unsigned_tx['nonce'])
    unsigned_tx['gasPrice'] = web3.to_hex(unsigned_tx['gasPrice'])
    unsigned_tx['gas'] = web3.to_hex(unsigned_tx['gas'])

    # Debugging: Print the transaction after conversion to verify changes
    print("Converted Transaction:", unsigned_tx)

    # Sign the transaction
    signed_tx = web3.eth.account.sign_transaction(unsigned_tx, private_key)

    # Return the signed transaction as a JSON string
    return json.dumps(signed_tx.rawTransaction.hex())

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python sign_tx.py <unsigned_tx_file> <private_key>")
        sys.exit(1)

    unsigned_tx_file = sys.argv[1]
    private_key = sys.argv[2]

    try:
        with open(unsigned_tx_file, 'r') as f:
            unsigned_tx_json = f.read()

        signed_tx = sign_transaction(unsigned_tx_json, private_key)
        print("Signed Transaction:", signed_tx)
    except Exception as e:
        print(f"Error: {e}")
