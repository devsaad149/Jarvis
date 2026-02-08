import axios from 'axios';

// Update this with your local IP or backend URL
const BACKEND_URL = 'http://10.0.2.2:8000/api'; // Standard Android emulator localhost

export const chatWithGemini = async (message, context = {}) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/chat`, {
            message,
            context,
        });
        return response.data;
    } catch (error) {
        console.error('Chat Service Error:', error);
        throw error;
    }
};

export const checkHealth = async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/health`);
        return response.data;
    } catch (error) {
        console.error('Health Check Error:', error);
        throw error;
    }
};
