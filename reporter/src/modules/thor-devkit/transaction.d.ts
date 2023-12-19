/// <reference types="node" />
/** Transaction class defines VeChainThor's multi-clause transaction */
export declare class Transaction {
    static readonly DELEGATED_MASK = 1;
    /** decode from Buffer to transaction
     * @param raw encoded buffer
     * @param unsigned to indicator if the encoded buffer contains signature
     */
    static decode(raw: Buffer, unsigned?: boolean): Transaction;
    readonly body: Transaction.Body;
    /** signature to transaction */
    signature?: Buffer;
    /**
     * construct a transaction object with given body
     * @param body body of tx
     */
    constructor(body: Transaction.Body);
    /**
     * returns transaction ID
     * null returned if something wrong (e.g. invalid signature)
     */
    get id(): string | null;
    /**
     * compute signing hashes.
     * It returns tx hash for origin or delegator depends on param `delegateFor`.
     * @param delegateFor address of intended tx origin. If set, the returned hash is for delegator to sign.
     */
    signingHash(delegateFor?: string): Buffer;
    /** returns tx origin. null returned if no signature or not incorrectly signed */
    get origin(): string | null;
    /** returns tx delegator. null returned if no signature or not incorrectly signed */
    get delegator(): string | null;
    /** returns whether delegated. see https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md */
    get delegated(): boolean;
    /** returns intrinsic gas it takes */
    get intrinsicGas(): number;
    /** encode into Buffer */
    encode(): Buffer;
    private _encodeReserved;
    private get _signatureValid();
}
export declare namespace Transaction {
    /** clause type */
    interface Clause {
        /**
         * destination address where transfer token to, or invoke contract method on.
         * set null destination to deploy a contract.
         */
        to: string | null;
        /** amount of token to transfer to the destination */
        value: string | number;
        /** input data for contract method invocation or deployment */
        data: string;
    }
    /** body type */
    interface Body {
        /** last byte of genesis block ID */
        chainTag: number;
        /** 8 bytes prefix of some block's ID */
        blockRef: string;
        /** constraint of time bucket */
        expiration: number;
        /** array of clauses */
        clauses: Clause[];
        /** coef applied to base gas price [0,255] */
        gasPriceCoef: number;
        /** max gas provided for execution */
        gas: string | number;
        /** ID of another tx that is depended */
        dependsOn: string | null;
        /** nonce value for various purposes */
        nonce: string | number;
        reserved?: {
            /** tx feature bits */
            features?: number;
            unused?: Buffer[];
        };
    }
    /**
     * calculates intrinsic gas that a tx costs with the given clauses.
     * @param clauses
     */
    function intrinsicGas(clauses: Clause[]): number;
}
