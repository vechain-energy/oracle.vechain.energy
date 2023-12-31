import { ec as EC } from 'elliptic';
const curve = new EC('secp256k1');
const N = Buffer.from('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 'hex');
const ZERO = Buffer.alloc(32, 0);
function isValidPrivateKey(key) {
    return Buffer.isBuffer(key) &&
        key.length === 32 &&
        !key.equals(ZERO) &&
        key.compare(N) < 0;
}
function isValidMessageHash(hash) {
    return Buffer.isBuffer(hash) && hash.length === 32;
}
/** secp256k1 methods set */
export var secp256k1;
(function (secp256k1) {
    /**
     * derive public key(uncompressed) from private key
     * @param privKey the private key
     */
    function derivePublicKey(privKey) {
        if (!isValidPrivateKey(privKey)) {
            throw new Error('invalid private key');
        }
        const keyPair = curve.keyFromPrivate(privKey);
        return Buffer.from(keyPair.getPublic().encode('array', false));
    }
    secp256k1.derivePublicKey = derivePublicKey;
    /**
     * sign a message using elliptic curve algorithm on the curve secp256k1
     * @param msgHash hash of message
     * @param privKey serialized private key
     */
    function sign(msgHash, privKey) {
        if (!isValidMessageHash(msgHash)) {
            throw new Error('invalid message hash');
        }
        if (!isValidPrivateKey(privKey)) {
            throw new Error('invalid private key');
        }
        const keyPair = curve.keyFromPrivate(privKey);
        const sig = keyPair.sign(msgHash, { canonical: true });
        const r = Buffer.from(sig.r.toArray('be', 32));
        const s = Buffer.from(sig.s.toArray('be', 32));
        return Buffer.concat([r, s, Buffer.from([sig.recoveryParam])]);
    }
    secp256k1.sign = sign;
    /**
     * recovery signature to public key
     * @param msgHash hash of message
     * @param sig signature
     */
    function recover(msgHash, sig) {
        if (!isValidMessageHash(msgHash)) {
            throw new Error('invalid message hash');
        }
        if (!Buffer.isBuffer(sig) || sig.length !== 65) {
            throw new Error('invalid signature');
        }
        const recovery = sig[64];
        if (recovery !== 0 && recovery !== 1) {
            throw new Error('invalid signature recovery');
        }
        const r = sig.slice(0, 32);
        const s = sig.slice(32, 64);
        return Buffer.from(curve.recoverPubKey(msgHash, { r, s }, recovery).encode('array', false));
    }
    secp256k1.recover = recover;
})(secp256k1 || (secp256k1 = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcDI1NmsxLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlY3AyNTZrMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBRW5DLE1BQU0sS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBRWpDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0VBQWtFLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDaEcsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFFaEMsU0FBUyxpQkFBaUIsQ0FBQyxHQUFXO0lBQ2xDLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7UUFDdkIsR0FBRyxDQUFDLE1BQU0sS0FBSyxFQUFFO1FBQ2pCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDakIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsSUFBWTtJQUNwQyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUE7QUFDdEQsQ0FBQztBQUVELDRCQUE0QjtBQUM1QixNQUFNLEtBQVcsU0FBUyxDQTRFekI7QUE1RUQsV0FBaUIsU0FBUztJQUN0Qjs7O09BR0c7SUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxHQUFrQjtRQUNqRCxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsU0FBVTtZQUNOLE1BQU0sT0FB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