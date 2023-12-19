import { address } from './address';
import { blake2b256 } from './blake2b';
import { RLP } from './rlp';
import { secp256k1 } from './secp256k1';
/** Transaction class defines VeChainThor's multi-clause transaction */
export class Transaction {
    /**
     * construct a transaction object with given body
     * @param body body of tx
     */
    constructor(body) {
        this.body = Object.assign({}, body);
    }
    /** decode from Buffer to transaction
     * @param raw encoded buffer
     * @param unsigned to indicator if the encoded buffer contains signature
     */
    static decode(raw, unsigned) {
        let body;
        let signature;
        if (unsigned) {
            body = unsignedTxRLP.decode(raw);
        }
        else {
            const decoded = txRLP.decode(raw);
            signature = decoded.signature;
            delete decoded.signature;
            body = decoded;
        }
        const reserved = body.reserved;
        if (reserved.length > 0) {
            if (reserved[reserved.length - 1].length === 0) {
                throw new Error('invalid reserved fields: not trimmed');
            }
            const features = featuresKind.buffer(reserved[0], 'reserved.features').decode();
            body.reserved = {
                features
            };
            if (reserved.length > 1) {
                body.reserved.unused = reserved.slice(1);
            }
        }
        else {
            delete body.reserved;
        }
        const tx = new Transaction(body);
        if (signature) {
            tx.signature = signature;
        }
        return tx;
    }
    /**
     * returns transaction ID
     * null returned if something wrong (e.g. invalid signature)
     */
    get id() {
        if (!this._signatureValid) {
            return null;
        }
        try {
            const signingHash = this.signingHash();
            const pubKey = secp256k1.recover(signingHash, this.signature.slice(0, 65));
            const origin = address.fromPublicKey(pubKey);
            return '0x' + blake2b256(signingHash, Buffer.from(origin.slice(2), 'hex')).toString('hex');
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * compute signing hashes.
     * It returns tx hash for origin or delegator depends on param `delegateFor`.
     * @param delegateFor address of intended tx origin. If set, the returned hash is for delegator to sign.
     */
    signingHash(delegateFor) {
        const reserved = this._encodeReserved();
        const buf = unsignedTxRLP.encode(Object.assign(Object.assign({}, this.body), { reserved }));
        const hash = blake2b256(buf);
        if (delegateFor) {
            if (!/^0x[0-9a-f]{40}$/i.test(delegateFor)) {
                throw new Error('delegateFor expected address');
            }
            return blake2b256(hash, Buffer.from(delegateFor.slice(2), 'hex'));
        }
        return hash;
    }
    /** returns tx origin. null returned if no signature or not incorrectly signed */
    get origin() {
        if (!this._signatureValid) {
            return null;
        }
        try {
            const signingHash = this.signingHash();
            const pubKey = secp256k1.recover(signingHash, this.signature.slice(0, 65));
            return address.fromPublicKey(pubKey);
        }
        catch (_a) {
            return null;
        }
    }
    /** returns tx delegator. null returned if no signature or not incorrectly signed */
    get delegator() {
        if (!this.delegated) {
            return null;
        }
        if (!this._signatureValid) {
            return null;
        }
        const origin = this.origin;
        if (!origin) {
            return null;
        }
        try {
            const signingHash = this.signingHash(origin);
            const pubKey = secp256k1.recover(signingHash, this.signature.slice(65));
            return address.fromPublicKey(pubKey);
        }
        catch (_a) {
            return null;
        }
    }
    /** returns whether delegated. see https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md */
    get delegated() {
        // tslint:disable-next-line:no-bitwise
        return (((this.body.reserved || {}).features || 0) & Transaction.DELEGATED_MASK) === Transaction.DELEGATED_MASK;
    }
    /** returns intrinsic gas it takes */
    get intrinsicGas() {
        return Transaction.intrinsicGas(this.body.clauses);
    }
    /** encode into Buffer */
    encode() {
        const reserved = this._encodeReserved();
        if (this.signature) {
            return txRLP.encode(Object.assign(Object.assign({}, this.body), { reserved, signature: this.signature }));
        }
        return unsignedTxRLP.encode(Object.assign(Object.assign({}, this.body), { reserved }));
    }
    _encodeReserved() {
        const reserved = this.body.reserved || {};
        const list = [featuresKind.data(reserved.features || 0, 'reserved.features').encode(),
            ...(reserved.unused || [])];
        // trim
        while (list.length > 0) {
            if (list[list.length - 1].length === 0) {
                list.pop();
            }
            else {
                break;
            }
        }
        return list;
    }
    get _signatureValid() {
        const expectedSigLen = this.delegated ? 65 * 2 : 65;
        return this.signature ? this.signature.length === expectedSigLen : false;
    }
}
Transaction.DELEGATED_MASK = 1;
(function (Transaction) {
    /**
     * calculates intrinsic gas that a tx costs with the given clauses.
     * @param clauses
     */
    function intrinsicGas(clauses) {
        const txGas = 5000;
        const clauseGas = 16000;
        const clauseGasContractCreation = 48000;
        if (clauses.length === 0) {
            return txGas + clauseGas;
        }
        return clauses.reduce((sum, c) => {
            if (c.to) {
                sum += clauseGas;
            }
            else {
                sum += clauseGasContractCreation;
            }
            sum += dataGas(c.data);
            return sum;
        }, txGas);
    }
    Transaction.intrinsicGas = intrinsicGas;
    function dataGas(data) {
        const zgas = 4;
        const nzgas = 68;
        let sum = 0;
        for (let i = 2; i < data.length; i += 2) {
            if (data.substr(i, 2) === '00') {
                sum += zgas;
            }
            else {
                sum += nzgas;
            }
        }
        return sum;
    }
})(Transaction || (Transaction = {}));
const unsignedTxRLP = new RLP({
    name: 'tx',
    kind: [
        { name: 'chainTag', kind: new RLP.NumericKind(1) },
        { name: 'blockRef', kind: new RLP.CompactFixedBlobKind(8) },
        { name: 'expiration', kind: new RLP.NumericKind(4) },
        {
            name: 'clauses', kind: {
                item: [
                    { name: 'to', kind: new RLP.NullableFixedBlobKind(20) },
                    { name: 'value', kind: new RLP.NumericKind(32) },
                    { name: 'data', kind: new RLP.BlobKind() },
                ],
            },
        },
        { name: 'gasPriceCoef', kind: new RLP.NumericKind(1) },
        { name: 'gas', kind: new RLP.NumericKind(8) },
        { name: 'dependsOn', kind: new RLP.NullableFixedBlobKind(32) },
        { name: 'nonce', kind: new RLP.NumericKind(8) },
        { name: 'reserved', kind: { item: new RLP.BufferKind() } },
    ],
});
const txRLP = new RLP({
    name: 'tx',
    kind: [...unsignedTxRLP.profile.kind, { name: 'signature', kind: new RLP.BufferKind() }],
});
const featuresKind = new RLP.NumericKind(4);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHJhbnNhY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUV2Qyx1RUFBdUU7QUFDdkUsTUFBTSxPQUFPLFdBQVc7SUFnRHBCOzs7T0FHRztJQUNILFlBQVksSUFBc0I7UUFDOUIsSUFBSSxDQUFDLElBQUkscUJBQVEsSUFBSSxDQUFFLENBQUE7SUFDM0IsQ0FBQztJQW5ERDs7O09BR0c7SUFDSSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQVcsRUFBRSxRQUFrQjtRQUNoRCxJQUFJLElBQXNCLENBQUE7UUFDMUIsSUFBSSxTQUE2QixDQUFBO1FBQ2pDLElBQUksUUFBUSxFQUFFO1lBQ1YsSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7U0FDbkM7YUFBTTtZQUNILE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFtQixDQUFBO1lBQ3ZDLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQTtZQUN4QixJQUFJLEdBQUcsT0FBTyxDQUFBO1NBQ2pCO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQW9CLENBQUE7UUFDMUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQixJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzVDLE1BQU0sSUFB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OUQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDL0MsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFO0tBQzdEO0NBQ0osQ0FBQyxDQUFBO0FBRUYsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDbEIsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsQ0FBQyxHQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBc0IsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Q0FDOUcsQ0FBQyxDQUFBO0FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBIn0=