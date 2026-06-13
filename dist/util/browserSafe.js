export function randomInt(max) {
    const range = max - 0;
    const rand = Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * range);
    return 0 + rand;
}
//# sourceMappingURL=browserSafe.js.map