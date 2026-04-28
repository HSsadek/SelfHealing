import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 30000,
});

export const analyzeUrl = async (url) => {
    try {
        const response = await api.post('/analyze-url', { url });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.error || 'Server error occurred');
        }
        throw new Error('Network error. Is the backend running?');
    }
};

export const checkHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const runFunctionalTest = async (url, steps) => {
    try {
        const response = await api.post('/test/run', { url, steps });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Test run failed');
    }
};

export const runSecurityScan = async (url) => {
    try {
        const response = await api.post('/test/security', { url });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Security scan failed');
    }
};

/**
 * Kicks off the autonomous orchestration run.
 * Returns immediately (202) — real-time updates arrive via WebSocket.
 */
export const startAutonomousRun = async (url) => {
    try {
        const response = await api.post('/test/autonomous', { url });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Autonomous run failed to start');
    }
};
