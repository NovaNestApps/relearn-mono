"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { tokenStorage } from "@/lib/auth";
import type { User } from "@/lib/auth";
import type { AuthResponse } from "@/types";
import { routes } from "@/lib/routes";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = tokenStorage.getAccess();
        if (!token) { setReady(true); return; }
        api.get("/auth/me")
            .then((res) => setUser(res.data as User))
            .catch(() => setUser(null))
            .finally(() => setReady(true));
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
        tokenStorage.setAccess(data.accessToken);
        tokenStorage.setRefresh(data.refreshToken);
        const me = await api.get<User>("/auth/me");
        setUser(me.data);
        return me.data;
    };

    const register = async (email: string, password: string, name?: string) => {
        const { data } = await api.post<AuthResponse>("/auth/register", { email, password, name });
        tokenStorage.setAccess(data.accessToken);
        tokenStorage.setRefresh(data.refreshToken);
        const me = await api.get<User>("/auth/me");
        setUser(me.data);
        return me.data;
    };

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch {}
        tokenStorage.clear();
        setUser(null);
        window.location.href = routes.login;
    };

    return { user, ready, login, register, logout, isAuthed: !!user };
}
