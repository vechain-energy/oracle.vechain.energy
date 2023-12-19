const blake = require('blakejs');
/**
 * computes blake2b 256bit hash of given data
 * @param data one or more Buffer | string
 */
export function blake2b256(...data) {
    const ctx = blake.blake2bInit(32, null);
    data.forEach(d => {
        if (Buffer.isBuffer(d)) {
            blake.blake2bUpdate(ctx, d);
        }
        else {
            blake.blake2bUpdate(ctx, Buffer.from(d, 'utf8'));
        }
    });
    return Buffer.from(blake.blake2bFinal(ctx));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxha2UyYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ibGFrZTJiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUVoQzs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFDLEdBQUcsSUFBNEI7SUFDdEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNiLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwQixLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtTQUM5QjthQUFNO1lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtTQUNuRDtJQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ0YsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUMvQyxDQUFDIn0=