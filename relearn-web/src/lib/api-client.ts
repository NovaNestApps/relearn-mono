import axios from "axios";
import { routes } from "@/lib/routes";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE!;
export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: false // backend uses tokens, not cookies
});

// --- Token helpers (access + refresh) ---
function getAccess() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
}
function setAccess(token: string) {
    localStorage.setItem("accessToken", token);
}
function getRefresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
}
function setRefresh(token: string) {
    localStorage.setItem("refreshToken", token);
}
export function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

// Attach bearer if present
api.interceptors.request.use((config) => {
    const token = getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Body-based refresh flow per Postman collection
let isRefreshing = false;
let pending: ((t: string | null) => void)[] = [];

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original: any = err.config;
        if (err.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    pending.push((token) => {
                        if (token) original.headers.Authorization = `Bearer ${token}`;
                        resolve(api(original));
                    });
                });
            }
            original._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = getRefresh();
                if (!refreshToken) throw new Error("No refresh token");
                // POST /api/auth/refresh with { refreshToken } - per Postman
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                if (data?.accessToken) setAccess(data.accessToken);
                if (data?.refreshToken) setRefresh(data.refreshToken);
                pending.forEach((cb) => cb(data?.accessToken || null));
                pending = [];
                original.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(original);
            } catch (e) {
                pending.forEach((cb) => cb(null));
                pending = [];
                clearTokens();
                if (typeof window !== "undefined") window.location.href = routes.login;
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(err);
    }
);

export const tokens = { getAccess, setAccess, getRefresh, setRefresh };
