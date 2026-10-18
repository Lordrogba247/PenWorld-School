import axios from "axios";

// ===== Base axios instance =====
const api = axios.create({
    baseURL: "https://penworld-demo-school-backend.vercel.app",
    headers: { "Content-Type": "application/json" },
});

// ===== Attach token to every request automatically =====
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ===== Handle expired token globally =====
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/portal";
        }
        return Promise.reject(error);
    }
);

export default api;

