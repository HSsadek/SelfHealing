const express = require('express');
const router = express.Router();
const { runTest } = require('../../engines/testRunner');
const { runSecurityScan } = require('../../engines/securityScanner');
const { runAutonomous } = require('../../engines/orchestrator');

/**
 * @route POST /api/test/autonomous
 * @desc One-click autonomous QA run — orchestrates all phases
 */
router.post('/autonomous', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ success: false, error: "Missing 'url'." });
    }
    // Respond immediately so the frontend doesn't hang — real updates arrive via WebSocket
    res.status(202).json({ success: true, message: 'Autonomous run started. Streaming events via WebSocket.' });

    // Run the heavy orchestration outside the request cycle
    runAutonomous(url).catch(e =>
        console.error('[Route] Autonomous run fatal:', e.message)
    );
});

/**
 * @route POST /api/test/run
 * @desc Runs an e2e test with self-healing capabilities
 * @access Public
 */
router.post('/run', async (req, res) => {
    try {
        const { url, steps } = req.body;
        
        if (!url || !Array.isArray(steps)) {
            return res.status(400).json({ success: false, error: "Missing 'url' or 'steps' array." });
        }

        const result = await runTest(url, steps);
        res.status(200).json({ success: true, ...result });

    } catch (error) {
        console.error('[Route] Functional Test Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to run test', details: error.message });
    }
});

/**
 * @route POST /api/test/security
 * @desc Runs a basic parallel security scan
 * @access Public
 */
router.post('/security', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ success: false, error: "Missing 'url'." });
        }

        const result = await runSecurityScan(url);
        res.status(200).json({ success: true, ...result });

    } catch (error) {
        console.error('[Route] Security Scan Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to run security scan', details: error.message });
    }
});

module.exports = router;
