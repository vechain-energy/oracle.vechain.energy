/// <reference types="node" />
/** secp256k1 methods set */
export declare namespace secp256k1 {
    /**
     * generate private key
     * @param rng the optional random number generator, which exactly generates 32 random bytes
     */
    function generatePrivateKey(rng?: () => Buffer): Buffer;
    /**
     * derive public key(uncompressed) from private key
     * @param privKey the private key
     */
    function derivePublicKey(privKey: Buffer): Buffer;
    /**
     * sign a message using elliptic curve algorithm on the curve secp256k1
     * @param msgHash hash of message
     * @param privKey serialized private key
     */
    function sign(msgHash: Buffer, privKey: Buffer): Buffer;
    /**
     * recovery signature to public key
     * @param msgHash hash of message
     * @param sig signature
     */
    function recover(msgHash: Buffer, sig: Buffer): Buffer;
}
