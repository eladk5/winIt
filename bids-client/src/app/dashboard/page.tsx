/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  bidsHistory,
  editMe,
  getSellerContact,
  me,
  meProfile,
  productsSelling,
  type MeResponse,
  type MyBidHistoryItem,
  type MySellingProductItem,
  type SellerContactResponse,
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = initialTabFromQuery(searchParams.get("tab"));
  const [user, setUser] = useState<MeResponse | null>(null);
  const [bidItems, setBidItems] = useState<MyBidHistoryItem[]>([]);
  const [salesItems, setSalesItems] = useState<MySellingProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [profileInitial, setProfileInitial] = useState<ProfileForm>(emptyProfile);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState({
    firstName: false,
    lastName: false,
    mobilePhone: false,
  });

  const isFieldInvalid = (field: "firstName" | "lastName" | "mobilePhone") => {
    return (touchedFields[field] || profileSubmitted) && !profileForm[field].trim();
  };

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<SellerContactResponse | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);



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
  const displayName = useMemo(() => {
    const fullName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim();
    return fullName || user?.username || "User";
  }, [profileForm.firstName, profileForm.lastName, user?.username]);
  const avatarLabel = useMemo(() => {
    const first = profileForm.firstName.trim();
    const last = profileForm.lastName.trim();
    const fromName = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

    if (fromName.trim()) {
      return fromName;
    }

    return (user?.username ?? "U").charAt(0).toUpperCase();
  }, [profileForm.firstName, profileForm.lastName, user?.username]);

  function switchTab(nextTab: DashboardTab) {
    window.location.href = `/dashboard?tab=${nextTab}`;
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSubmitted(true);

    if (!profileForm.firstName.trim() || !profileForm.lastName.trim() || !profileForm.mobilePhone.trim()) {
      setErrorMessage("First Name, Last Name, and Phone Number cannot be empty.");
      return;
    }

    const payload = {
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      mobilePhone: profileForm.mobilePhone.trim(),
      city: profileForm.city.trim() || null,
      street: profileForm.street.trim() || null,
      zipCode: profileForm.zipCode.trim() || null,
    };

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

  async function handleViewContact(productId: number) {
    setContactModalOpen(true);
    setContactLoading(true);
    setContactError(null);
    setSelectedContact(null);

    try {
      const contact = await getSellerContact(productId);
      setSelectedContact(contact);
    } catch (error) {
      setContactError(error instanceof ApiError ? error.message : "Unable to load contact details.");
    } finally {
      setContactLoading(false);
    }
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

        <div className="mb-8 flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 md:flex-row">
          <div className="rounded-full border-2 border-primary bg-primary/10 p-1">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {avatarLabel}
            </div>
          </div>
          <div className="flex flex-col text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
            <p className="font-medium text-slate-500">@{user?.username ?? "user"}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-4 md:justify-start">
              <button
                className="flex items-center gap-1 text-sm font-semibold text-slate-700 transition-colors hover:text-primary"
                onClick={() => {
                  switchTab("bids");
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-sm text-primary">gavel</span>
                {bidItems.length} Bids
              </button>
              <button
                className="flex items-center gap-1 text-sm font-semibold text-slate-700 transition-colors hover:text-primary"
                onClick={() => {
                  switchTab("sales");
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-sm text-primary">storefront</span>
                {activeSalesCount} Active Sales
              </button>
              {profileForm.city.trim() && (
                <button
                  className="flex items-center gap-1 text-sm font-semibold text-slate-700 transition-colors hover:text-primary"
                  onClick={() => {
                    switchTab("profile");
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                  {profileForm.city}
                </button>
              )}
            </div>
          </div>
          <div className="flex-grow"></div>
          <div className="flex gap-3">
            <Link
              className="rounded-lg bg-primary px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700"
              href="/sell"
            >
              Post New Listing
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-b border-slate-200">
            <nav aria-label="Tabs" className="flex gap-8">
              <button
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm transition-all ${activeTab === "bids"
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                onClick={() => {
                  switchTab("bids");
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">gavel</span>
                My Bids
              </button>
              <button
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm transition-all ${activeTab === "sales"
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                onClick={() => {
                  switchTab("sales");
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">storefront</span>
                My Sales
              </button>
              <button
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm transition-all ${activeTab === "profile"
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                onClick={() => {
                  switchTab("profile");
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">person</span>
                Profile Settings
              </button>
            </nav>
          </div>

          {activeTab === "bids" && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Product Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Current Price</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">My Bid</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Time Left</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
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
                      <tr className="transition-colors hover:bg-slate-50" key={`${item.productId}-${item.endTime}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {resolveImageUrl(item.imageUrl) ? (
                                <img alt={item.productName} className="h-full w-full object-cover" src={resolveImageUrl(item.imageUrl)!} />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="material-symbols-outlined text-sm text-slate-300">image</span>
                                </div>
                              )}
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
                        <td className="px-6 py-5 text-slate-500" suppressHydrationWarning>{formatTimeLeft(item.endTime, nowMs)}</td>
                        <td className="px-6 py-5 text-right">
                          {item.status.trim().toUpperCase() === "WON" && (
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                              onClick={() => {
                                handleViewContact(item.productId);
                              }}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[1rem]">contact_mail</span>
                              Contact Seller
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">My Sales</h2>
                <Link className="text-sm font-bold text-primary hover:underline" href="/sell">
                  View All Listings
                </Link>
              </div>
              {salesItems.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No listings found.</div>
              )}

              {salesItems.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {salesItems.map((item) => {
                    const tone = statusTone(item.status);
                    const isActive = item.status.trim().toUpperCase() === "ACTIVE";

                    return (
                      <div
                        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${isActive ? "" : "opacity-80"}`}
                        key={`${item.productId}-${item.endTime}`}
                      >
                        <div className={`relative h-40 overflow-hidden ${isActive ? "" : "grayscale"}`}>
                          {resolveImageUrl(item.imageUrl) ? (
                            <img alt={item.productName} className="h-full w-full object-cover" src={resolveImageUrl(item.imageUrl)!} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                            </div>
                          )}
                          <span
                            className={`absolute right-3 top-3 rounded px-2 py-1 text-[10px] font-bold uppercase text-white ${tone === "green"
                                ? "bg-green-500"
                                : tone === "red"
                                  ? "bg-red-500"
                                  : tone === "amber"
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                              }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold">{item.productName}</h3>
                            <span className={`font-bold ${isActive ? "text-primary" : "text-slate-400"}`}>
                              {formatCurrency(item.currentPrice)}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-500">Location: {item.deliveryLocation}</p>
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
                          {item.canEdit ? (
                            <Link
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 font-bold text-slate-700 transition-all hover:bg-slate-200"
                              href={`/products/${item.productId}/edit`}
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit Listing
                            </Link>
                          ) : isActive ? (
                            <Link
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 font-bold text-slate-700 transition-all hover:bg-slate-200"
                              href={`/products/${item.productId}`}
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              View Listing
                            </Link>
                          ) : (
                            <button
                              className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 font-bold text-slate-400"
                              type="button"
                            >
                              Archived
                            </button>
                          )}
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
                <h2 className="text-xl font-bold text-slate-900">Profile Settings</h2>
                <p className="text-sm text-slate-500">Manage your personal information and contact details.</p>
              </div>
              <form className="space-y-6" onSubmit={handleProfileSave}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">First Name</label>
                    <input
                      className={`rounded-lg border-slate-200 focus:border-primary focus:ring-primary ${isFieldInvalid("firstName") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      onBlur={() => {
                        setTouchedFields((previous) => ({ ...previous, firstName: true }));
                      }}
                      onChange={(event) => {
                        setProfileForm((previous) => ({ ...previous, firstName: event.target.value }));
                      }}
                      required
                      type="text"
                      value={profileForm.firstName}
                    />
                    {isFieldInvalid("firstName") && (
                      <p className="text-xs font-medium text-red-500">First Name is required</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">Last Name</label>
                    <input
                      className={`rounded-lg border-slate-200 focus:border-primary focus:ring-primary ${isFieldInvalid("lastName") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      onBlur={() => {
                        setTouchedFields((previous) => ({ ...previous, lastName: true }));
                      }}
                      onChange={(event) => {
                        setProfileForm((previous) => ({ ...previous, lastName: event.target.value }));
                      }}
                      required
                      type="text"
                      value={profileForm.lastName}
                    />
                    {isFieldInvalid("lastName") && (
                      <p className="text-xs font-medium text-red-500">Last Name is required</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">Phone Number</label>
                    <input
                      className={`rounded-lg border-slate-200 focus:border-primary focus:ring-primary ${isFieldInvalid("mobilePhone") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      onBlur={() => {
                        setTouchedFields((previous) => ({ ...previous, mobilePhone: true }));
                      }}
                      onChange={(event) => {
                        setProfileForm((previous) => ({ ...previous, mobilePhone: event.target.value }));
                      }}
                      required
                      type="tel"
                      value={profileForm.mobilePhone}
                    />
                    {isFieldInvalid("mobilePhone") && (
                      <p className="text-xs font-medium text-red-500">Phone Number is required</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">City</label>
                    <input
                      className="rounded-lg border-slate-200 focus:border-primary focus:ring-primary"
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
                      className="rounded-lg border-slate-200 focus:border-primary focus:ring-primary"
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
                      className="rounded-lg border-slate-200 focus:border-primary focus:ring-primary"
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
                    className="rounded-lg border border-slate-300 px-6 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    onClick={() => {
                      setProfileForm(profileInitial);
                      setProfileSavedMessage(null);
                      setErrorMessage(null);
                      setProfileSubmitted(false);
                      setTouchedFields({
                        firstName: false,
                        lastName: false,
                        mobilePhone: false,
                      });
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-primary px-6 py-2 font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={
                      savingProfile ||
                      !profileForm.firstName.trim() ||
                      !profileForm.lastName.trim() ||
                      !profileForm.mobilePhone.trim()
                    }
                    type="submit"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Seller Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Seller Contact</h3>
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => {
                  setContactModalOpen(false);
                }}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              {contactLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
                </div>
              )}
              {contactError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {contactError}
                </div>
              )}
              {selectedContact && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {selectedContact.firstName?.charAt(0).toUpperCase() ?? ""}
                      {selectedContact.lastName?.charAt(0).toUpperCase() ?? ""}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 font-medium text-slate-700">
                    {selectedContact.mobilePhone && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="material-symbols-outlined text-slate-400">call</span>
                        <a className="hover:text-primary hover:underline" href={`tel:${selectedContact.mobilePhone}`}>
                          {selectedContact.mobilePhone}
                        </a>
                      </div>
                    )}
                    {(selectedContact.city || selectedContact.street) && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="material-symbols-outlined text-slate-400">location_on</span>
                        <span>
                          {[selectedContact.street, selectedContact.city, selectedContact.zipCode]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200"
                onClick={() => {
                  setContactModalOpen(false);
                }}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light px-6 py-8 lg:px-40">
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100"></div>
            <div className="h-40 animate-pulse rounded-lg bg-slate-100"></div>
            <div className="h-96 animate-pulse rounded-lg bg-slate-100"></div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}


