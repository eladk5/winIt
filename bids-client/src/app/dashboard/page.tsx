/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  bidsHistory,
  editMe,
  logout,
  me,
  meProfile,
  productsSelling,
  type MyBidHistoryItem,
  type MySellingProductItem,
  type MeResponse,
} from "@/lib/api";
import { formatCurrency, formatTimeLeft, resolveImageUrl, statusTone } from "@/lib/format";

type DashboardTab = "bids" | "sales" | "profile";

type ProfileForm = {
  firstName: string;
  lastName: string;
  mobilePhone: string;
  city: string;
  street: string;
  zipCode: string;
};

const emptyProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  mobilePhone: "",
  city: "",
  street: "",
  zipCode: "",
};

function toneClasses(tone: ReturnType<typeof statusTone>): string {
  if (tone === "green") {
    return "bg-green-100 text-green-700";
  }

  if (tone === "red") {
    return "bg-red-100 text-red-700";
  }

  if (tone === "amber") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function initialTabFromQuery(tab: string | null): DashboardTab {
  if (tab === "sales") {
    return "sales";
  }

  if (tab === "profile") {
    return "profile";
  }

  return "bids";
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTabFromQuery(searchParams.get("tab")));
  const [user, setUser] = useState<MeResponse | null>(null);
  const [bidItems, setBidItems] = useState<MyBidHistoryItem[]>([]);
  const [salesItems, setSalesItems] = useState<MySellingProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [profileInitial, setProfileInitial] = useState<ProfileForm>(emptyProfile);

  useEffect(() => {
    setActiveTab(initialTabFromQuery(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [meData, profileData, myBids, mySales] = await Promise.all([me(), meProfile(), bidsHistory(), productsSelling()]);

        if (!isMounted) {
          return;
        }

        setUser(meData);
        setBidItems(myBids);
        setSalesItems(mySales);
        const initialProfile: ProfileForm = {
          firstName: profileData.firstName ?? "",
          lastName: profileData.lastName ?? "",
          mobilePhone: profileData.mobilePhone ?? "",
          city: profileData.city ?? "",
          street: profileData.street ?? "",
          zipCode: profileData.zipCode ?? "",
        };
        setProfileForm(initialProfile);
        setProfileInitial(initialProfile);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth?redirect=/dashboard");
          return;
        }

        setErrorMessage(error instanceof ApiError ? error.message : "Unable to load dashboard right now.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const activeSalesCount = useMemo(
    () => salesItems.filter((item) => item.status.trim().toUpperCase() === "ACTIVE").length,
    [salesItems],
  );

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      firstName: profileForm.firstName || undefined,
      lastName: profileForm.lastName || undefined,
      mobilePhone: profileForm.mobilePhone || undefined,
      city: profileForm.city || undefined,
      street: profileForm.street || undefined,
      zipCode: profileForm.zipCode || undefined,
    };

    if (
      payload.firstName === undefined &&
      payload.lastName === undefined &&
      payload.mobilePhone === undefined &&
      payload.city === undefined &&
      payload.street === undefined &&
      payload.zipCode === undefined
    ) {
      setProfileSavedMessage(null);
      setErrorMessage("Enter at least one field before saving.");
      return;
    }

    setSavingProfile(true);
    setErrorMessage(null);
    setProfileSavedMessage(null);

    try {
      const response = await editMe(payload);

      const nextProfile: ProfileForm = {
        firstName: response.firstName ?? "",
        lastName: response.lastName ?? "",
        mobilePhone: response.mobilePhone ?? "",
        city: response.city ?? "",
        street: response.street ?? "",
        zipCode: response.zipCode ?? "",
      };

      setProfileForm(nextProfile);
      setProfileInitial(nextProfile);
      setProfileSavedMessage("Profile changes were saved.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setErrorMessage(null);

    try {
      await logout();
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401 && error.status !== 403) {
        setErrorMessage(error.message);
        setLoggingOut(false);
        return;
      }
    }

    router.replace("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light px-6 py-8 lg:px-40">
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-slate-100"></div>
          <div className="h-40 animate-pulse rounded-lg bg-slate-100"></div>
          <div className="h-96 animate-pulse rounded-lg bg-slate-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light font-display text-slate-900">
      <main className="flex flex-1 flex-col px-4 py-8 lg:px-40">
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}
        {profileSavedMessage && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {profileSavedMessage}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">User</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{user?.username ?? ""}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">My Bids</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{bidItems.length}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">My Sales</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{salesItems.length}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Active Sales</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{activeSalesCount}</p>
          </div>
        </div>

        <div className="mb-6 border-b border-slate-200">
          <nav aria-label="Tabs" className="flex gap-8">
            <button
              className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm transition-all ${activeTab === "bids"
                  ? "border-primary font-bold text-primary"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              onClick={() => {
                setActiveTab("bids");
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">gavel</span>
              My Bids
            </button>
            <button
              className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm transition-all ${activeTab === "sales"
                  ? "border-primary font-bold text-primary"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              onClick={() => {
                setActiveTab("sales");
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">storefront</span>
              My Sales
            </button>
            <button
              className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm transition-all ${activeTab === "profile"
                  ? "border-primary font-bold text-primary"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              onClick={() => {
                setActiveTab("profile");
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              Profile
            </button>
          </nav>
        </div>

        {activeTab === "bids" && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Product</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Current Price</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">My Max Bid</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Time Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bidItems.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-sm text-slate-500" colSpan={5}>
                        No bids found.
                      </td>
                    </tr>
                  )}
                  {bidItems.map((item) => (
                    <tr className="hover:bg-slate-50" key={`${item.productId}-${item.endTime}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                            <img alt={item.productName} className="h-full w-full object-cover" src={resolveImageUrl(item.imageUrl)} />
                          </div>
                          <Link className="font-semibold hover:text-primary" href={`/products/${item.productId}`}>
                            {item.productName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-600">{formatCurrency(item.currentPrice)}</td>
                      <td className="px-6 py-5 font-bold text-primary">{formatCurrency(item.myMaxBid)}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${toneClasses(statusTone(item.status))}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-500">{formatTimeLeft(item.endTime, nowMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sales" && (
          <div className="space-y-4">
            {salesItems.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No listings found.</div>
            )}

            {salesItems.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {salesItems.map((item) => {
                  const tone = statusTone(item.status);

                  return (
                    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white" key={`${item.productId}-${item.endTime}`}>
                      <div className="relative h-40 overflow-hidden">
                        <img alt={item.productName} className="h-full w-full object-cover" src={resolveImageUrl(item.imageUrl)} />
                        <span className={`absolute top-3 right-3 rounded px-2 py-1 text-[10px] font-bold uppercase text-white ${tone === "green"
                            ? "bg-green-500"
                            : tone === "red"
                              ? "bg-red-500"
                              : tone === "amber"
                                ? "bg-amber-500"
                                : "bg-slate-500"
                          }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold">{item.productName}</h3>
                          <span className="font-bold text-primary">{formatCurrency(item.currentPrice)}</span>
                        </div>
                        <p className="text-sm text-slate-500">Location: {item.deliveryLocation}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">gavel</span>
                            {item.bidCount} bids
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {formatTimeLeft(item.endTime, nowMs)}
                          </span>
                        </div>
                        <Link
                          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-bold ${item.canEdit ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-100 text-slate-400"
                            }`}
                          href={item.canEdit ? `/products/${item.productId}` : "#"}
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          {item.canEdit ? "Open" : "Locked"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Profile</h2>
              <p className="text-sm text-slate-500">Saved fields are written to DB via `/api/me/edit`.</p>
            </div>
            <form className="space-y-6" onSubmit={handleProfileSave}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">First Name</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, firstName: event.target.value }));
                    }}
                    type="text"
                    value={profileForm.firstName}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Last Name</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, lastName: event.target.value }));
                    }}
                    type="text"
                    value={profileForm.lastName}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Phone Number</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, mobilePhone: event.target.value }));
                    }}
                    type="tel"
                    value={profileForm.mobilePhone}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">City</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, city: event.target.value }));
                    }}
                    type="text"
                    value={profileForm.city}
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Street</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, street: event.target.value }));
                    }}
                    type="text"
                    value={profileForm.street}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Zip Code</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, zipCode: event.target.value }));
                    }}
                    type="text"
                    value={profileForm.zipCode}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  className="rounded-lg border border-slate-300 px-6 py-2 font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setProfileForm(profileInitial);
                    setProfileSavedMessage(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Reset
                </button>
                <button
                  className="rounded-lg bg-primary px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={savingProfile}
                  type="submit"
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
