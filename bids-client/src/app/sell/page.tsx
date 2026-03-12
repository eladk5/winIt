/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { ApiError, createProduct, listCategories, me } from "@/lib/api";

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

type SellForm = {
  name: string;
  description: string;
  category: string;
  deliveryLocation: string;
  startingPrice: string;
  endDate: Date | null;
  endTime: Date | null;
  imageFile: File | null;
};

function createDefaultForm(): SellForm {
  return {
    name: "",
    description: "",
    category: "",
    deliveryLocation: "",
    startingPrice: "",
    endDate: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 24, 0, 0, 0)),
    imageFile: null,
  };
}

export default function SellPage() {
  const router = useRouter();

  const [form, setForm] = useState<SellForm>(() => createDefaultForm());
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number } | null>(null);

  const minDateConfig = useMemo(() => new Date(), []);

  const previewUrl = useMemo(() => {
    if (!form.imageFile) {
      return null;
    }

    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

  // Remove calculatedDurationMinutes

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      setErrorMessage(null);

      try {
        await me();
        const categoryItems = await listCategories();

        if (!isMounted) {
          return;
        }

        setCategories(categoryItems);
        setForm((previous) => ({
          ...previous,
          category: previous.category || categoryItems[0] || "",
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          router.replace(`/auth?redirect=${encodeURIComponent("/sell")}`);
          return;
        }

        setErrorMessage(error instanceof ApiError ? error.message : "Unable to initialize sell form.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setForm((previous) => ({
      ...previous,
      imageFile: file,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    const startingPriceNumber = Number(form.startingPrice);

    if (!Number.isFinite(startingPriceNumber) || startingPriceNumber <= 0) {
      setSubmitting(false);
      setErrorMessage("Starting price must be greater than 0.");
      return;
    }

    if (!form.endDate || !form.endTime) {
      setSubmitting(false);
      setErrorMessage("Please select both end date and time.");
      return;
    }

    const endDateTime = new Date(
      form.endDate.getFullYear(),
      form.endDate.getMonth(),
      form.endDate.getDate(),
      form.endTime.getHours(),
      form.endTime.getMinutes()
    );

    if (Number.isNaN(endDateTime.getTime())) {
      setSubmitting(false);
      setErrorMessage("Invalid date or time selected.");
      return;
    }

    const durationMinutesNumber = Math.ceil((endDateTime.getTime() - Date.now()) / 60_000);

    if (durationMinutesNumber < 10) {
      setSubmitting(false);
      setErrorMessage("Auction duration must be at least 10 minutes from now.");
      return;
    }

    try {
      const created = await createProduct({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        deliveryLocation: form.deliveryLocation.trim(),
        image: form.imageFile,
        startingPrice: startingPriceNumber,
        durationMinutes: durationMinutesNumber,
      });

      setSuccess({ id: created.id });

      const selectedCategory = form.category;
      setForm({
        ...createDefaultForm(),
        category: selectedCategory,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/auth?redirect=${encodeURIComponent("/sell")}`);
        return;
      }

      setErrorMessage(error instanceof ApiError ? error.message : "Unable to create product right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Create New Listing</h1>
          <p className="mt-2 text-sm text-slate-500">Upload your product, set a starting price, and start receiving bids.</p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {success && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
            <span>Product created successfully.</span>
            <Link className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700" href={`/products/${success.id}`}>
              Open Product
            </Link>
          </div>
        )}

        <form className="grid grid-cols-1 gap-6 lg:grid-cols-12" onSubmit={handleSubmit}>
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="name">
                Product Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="name"
                maxLength={120}
                onChange={(event) => {
                  setForm((previous) => ({ ...previous, name: event.target.value }));
                }}
                placeholder="Vintage Leica M6 Camera"
                required
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="description">
                Description
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="description"
                onChange={(event) => {
                  setForm((previous) => ({ ...previous, description: event.target.value }));
                }}
                placeholder="Describe condition, accessories, shipping details..."
                rows={5}
                value={form.description}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="category">
                  Category
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="category"
                  onChange={(event) => {
                    setForm((previous) => ({ ...previous, category: event.target.value }));
                  }}
                  required
                  value={form.category}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="location">
                  Delivery Location
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="location"
                  onChange={(event) => {
                    setForm((previous) => ({ ...previous, deliveryLocation: event.target.value }));
                  }}
                  placeholder="Tel Aviv"
                  required
                  type="text"
                  value={form.deliveryLocation}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="startPrice">
                  Starting Price
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-slate-400">
                    $
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    id="startPrice"
                    min="0.01"
                    onChange={(event) => {
                      setForm((previous) => ({ ...previous, startingPrice: event.target.value }));
                    }}
                    placeholder="100.00"
                    required
                    step="0.01"
                    type="number"
                    value={form.startingPrice}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="endDate">
                  End Date
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-[13px] z-10 text-[20px] text-slate-400">
                    calendar_today
                  </span>
                  <DatePicker
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    dateFormat="MMM d, yyyy"
                    id="endDate"
                    minDate={minDateConfig}
                    onChange={(date: Date | null) => {
                      setForm((previous) => ({ ...previous, endDate: date }));
                    }}
                    placeholderText="Select date..."
                    required
                    selected={form.endDate}
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="endTime">
                  End Time
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-[13px] z-10 text-[20px] text-slate-400">
                    schedule
                  </span>
                  <DatePicker
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    dateFormat="h:mm aa"
                    id="endTime"
                    onChange={(date: Date | null) => {
                      setForm((previous) => ({ ...previous, endTime: date }));
                    }}
                    placeholderText="Select time..."
                    required
                    selected={form.endTime}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <h2 className="text-lg font-bold">Product Image</h2>

            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 hover:border-primary hover:text-primary">
              <input accept="image/*" className="hidden" onChange={handleFileChange} type="file" />
              <span className="material-symbols-outlined mr-2">upload</span>
              {form.imageFile ? "Replace image" : "Upload image"}
            </label>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {previewUrl ? (
                <img alt="Preview" className="aspect-[4/3] w-full object-cover" src={previewUrl} />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-slate-400">No image selected</div>
              )}
            </div>

            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {submitting ? "Publishing..." : "Publish Listing"}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}
