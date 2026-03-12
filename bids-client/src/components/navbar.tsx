"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, logout, me, MeResponse } from "@/lib/api";

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<MeResponse | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        if (!user) {
            setIsLoadingUser(true);
        }
        
        me()
            .then((data) => {
                if (isMounted) {
                    if (data && data.id) {
                        setUser(data);
                    } else {
                        setUser(null);
                    }
                }
            })
            .catch(() => {
                if (isMounted) {
                    setUser(null);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoadingUser(false);
                }
            });

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Close user menu on outside click
    useEffect(() => {
        function handleDocumentClick(event: MouseEvent) {
            if (!userMenuRef.current) {
                return;
            }

            if (!userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocumentClick);
        return () => {
            document.removeEventListener("mousedown", handleDocumentClick);
        };
    }, []);

    // Close menu on route change
    useEffect(() => {
        setIsUserMenuOpen(false);
    }, [pathname]);

    async function handleSignOut() {
        try {
            await logout();
        } catch (error) {
            if (error instanceof ApiError && error.status !== 401 && error.status !== 403) {
                return;
            }
        }

        setIsUserMenuOpen(false);
        router.push("/auth");
    }

    // Don't render navbar on auth page
    if (pathname.startsWith("/auth")) {
        return null;
    }

    const navLinks = [
        { href: "/", label: "Browse", icon: "storefront", match: (p: string) => p === "/" },
        { href: "/sell", label: "Sell", icon: "add_circle", match: (p: string) => p === "/sell" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 px-4 py-0 backdrop-blur-md lg:px-10">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
                {/* Logo */}
                <Link className="flex items-center gap-2.5 text-primary" href="/">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/20">
                        <span className="material-symbols-outlined text-lg text-white">gavel</span>
                    </div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">AuctionApp</h2>
                </Link>

                {/* Navigation links */}
                <nav className="hidden items-center gap-1 md:flex">
                    {navLinks.map((link) => {
                        const isActive = link.match(pathname);
                        return (
                            <Link
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-primary/10 font-semibold text-primary"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                href={link.href}
                                key={link.href}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-primary" : "text-slate-400"}`}>
                                    {link.icon}
                                </span>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right side: user menu */}
                <div className="flex items-center gap-2">
                    {/* Mobile nav links */}
                    <div className="flex items-center gap-1 md:hidden">
                        {navLinks.map((link) => {
                            const isActive = link.match(pathname);
                            return (
                                <Link
                                    aria-label={link.label}
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${isActive ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        }`}
                                    href={link.href}
                                    key={link.href}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* User menu or Auth links */}
                    {isLoadingUser ? (
                        <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200"></div>
                    ) : user ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                aria-expanded={isUserMenuOpen}
                                aria-haspopup="menu"
                                aria-label="User menu"
                                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${isUserMenuOpen
                                    ? "bg-primary/10 text-primary"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                    }`}
                                onClick={() => {
                                    setIsUserMenuOpen((previous) => !previous);
                                }}
                                type="button"
                            >
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-col gap-0.5">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account</p>
                                        <p className="text-sm font-medium text-slate-700 truncate">{user.username}</p>
                                    </div>
                                    <Link
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                        href="/dashboard?tab=bids"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-slate-400">gavel</span>
                                        My Bids
                                    </Link>
                                    <Link
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                        href="/dashboard?tab=sales"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-slate-400">storefront</span>
                                        My Sales
                                    </Link>
                                    <Link
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                        href="/dashboard?tab=profile"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                                        Profile
                                    </Link>
                                    <div className="border-t border-slate-100">
                                        <button
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                            onClick={handleSignOut}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">logout</span>
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                className="hidden md:flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                                href="/auth"
                            >
                                Sign in
                            </Link>
                            <Link
                                className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/20 transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
                                href="/auth"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
