/// <reference types="node" />
/** address related utilities */
export declare namespace address {
    /**
     * derive Address from public key, note that the public key is uncompressed
     * @param pub the public key
     */
    function fromPublicKey(pub: Buffer): string;
    /**
     * to check if a value presents an address
     * @param v the value to be checked
     */
    function test(v: any): v is string;
    /**
     * encode the address to checksumed address that is compatible with eip-55
     * @param address input address
     */
    function toChecksumed(addr: string): string;
}
