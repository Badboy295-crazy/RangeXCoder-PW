// Global configuration for backend API base URL
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname.includes('netlify.app')
    ? ''
    : 'https://rangexcoder-backend.onrender.com';
