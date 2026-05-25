export type User = { id: string; email: string; name?: string };

export const tokenStorage = {
    getAccess: () => (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null),
    setAccess: (t: string) => localStorage.setItem("accessToken", t),
    getRefresh: () => (typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null),
    setRefresh: (t: string) => localStorage.setItem("refreshToken", t),
    clear: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
    }
};
