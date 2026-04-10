/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductForm, type ProductFormState } from "@/components/product-form";

import { ApiError, createProduct, listCategories, me } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}



function createDefaultForm(): ProductFormState {
  return {
    name: "",
    description: "",
    category: "",
    deliveryLocation: "",
    startingPrice: "",
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(new Date().setHours(new Date().getHours() + 24, 0, 0, 0)),
    imageFile: null,
  };
}

export default function SellPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProductFormState>(() => createDefaultForm());
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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



  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    const startingPriceNumber = Number(form.startingPrice);

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
      // Upload image to Cloudinary first (if provided)
      let imageUrl: string | undefined;

      if (form.imageFile) {
        setUploadingImage(true);

        try {
          imageUrl = await uploadImageToCloudinary(form.imageFile);
        } finally {
          setUploadingImage(false);
        }
      }

      const created = await createProduct({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        deliveryLocation: form.deliveryLocation.trim(),
        imageUrl,
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

        <ProductForm
          categories={categories}
          displayImageUrl={previewUrl}
          form={form}
          onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
          onSubmit={handleSubmit}
          submitButtonText="Publish Listing"
          submitting={submitting}
          uploadButtonText="Upload image"
          uploadingImage={uploadingImage}
        />
      </main>
    </div>
  );
}
