import type { Transaction } from './thor-devkit/transaction'
import { address as thorAddress } from "./thor-devkit/address";
import { secp256k1 } from "./thor-devkit/secp256k1";

export async function signTransaction(transaction: Transaction, privateKey: string): Promise<{ signature: string, address: string }> {
	const key = Buffer.from(privateKey.slice(2), 'hex')

	const transactionHash = transaction.signingHash()
	const bufSignature = secp256k1.sign(transactionHash, key)
	const publicKey = secp256k1.derivePublicKey(key)
	const address = thorAddress.fromPublicKey(publicKey)

	return {
		signature: `0x${bufSignature.toString('hex')}`,
		address
	}
}


export default signTransaction