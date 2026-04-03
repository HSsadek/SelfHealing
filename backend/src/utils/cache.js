const NodeCache = require('node-cache');

// Standard TTL of 24 hours for parsed sites
const aiResultCache = new NodeCache({ stdTTL: 60 * 60 * 24 });

// Tracks currently executing requests to prevent dual-processing the same URL
const inFlightRequests = new Map();

/**
 * Wraps an async function with both Caching and Deduplication.
 * @param {string} key Unique identifier for the operation
 * @param {Function} asyncOperation The core task returning a Promise
 */
const withCacheAndDedup = async (key, asyncOperation) => {
    // 1. Check final cache
    const cachedResult = aiResultCache.get(key);
    if (cachedResult) {
        console.log(`[Cache] HIT for key: ${key}`);
        return cachedResult;
    }

    // 2. Check if a request is already running for this key
    if (inFlightRequests.has(key)) {
        console.log(`[Dedup] Waiting for existing inflight request for key: ${key}`);
        return inFlightRequests.get(key);
    }

    // 3. Otherwise execute and store the shared promise
    console.log(`[Cache] MISS for key: ${key}. Initiating operation...`);
    const executingPromise = asyncOperation()
        .then(result => {
            // Save successful result (only store success to prevent caching errors)
            if (result && !result.error) {
                 aiResultCache.set(key, result);
            }
            return result;
        })
        .finally(() => {
            // Cleanup the inflight lock
            inFlightRequests.delete(key);
        });

    inFlightRequests.set(key, executingPromise);

    return executingPromise;
};

module.exports = {
    withCacheAndDedup,
    aiResultCache
};
