
const Bottleneck = require('bottleneck');

// Limit Gemini requests to 5 concurrent outgoing calls.
// Depending on user API quota free tier is typically 15 RPM.
// Adjust parameters here to fit limits. (e.g. 1 req / 4 secs for free tier)
const geminiQueue = new Bottleneck({
  maxConcurrent: 2,          // Process up to 2 tasks simultaneously
  minTime: 2000              // Enforce 2 seconds minimum between job starts
});

geminiQueue.on("error", (error) => {
  console.error("[Bottleneck Queue Error]", error);
});

module.exports = {
  geminiQueue
};

