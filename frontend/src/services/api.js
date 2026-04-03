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
