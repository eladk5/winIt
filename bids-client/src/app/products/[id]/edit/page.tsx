/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductForm, type ProductFormState } from "@/components/product-form";

import {
  ApiError,
  getProductById,
  listCategories,
  me,
  updateProduct,
  type ProductDetailsResponse,
} from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { resolveImageUrl } from "@/lib/format";

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}



function productToForm(product: ProductDetailsResponse): ProductFormState {
  const endDateTime = new Date(product.endTime);

  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category,
    deliveryLocation: product.deliveryLocation,
    startingPrice: String(product.startingPrice),
    endDate: endDateTime,
    endTime: endDateTime,
    imageFile: null,
  };
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(params.id);

  const [product, setProduct] = useState<ProductDetailsResponse | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const minDateConfig = useMemo(() => new Date(), []);

  const previewUrl = useMemo(() => {
    if (!form?.imageFile) {
      return null;
    }

    return URL.createObjectURL(form.imageFile);
  }, [form?.imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setLoading(false);
      setErrorMessage("Invalid product id.");
      return;
    }

    let isMounted = true;

    async function init() {
      setLoading(true);
      setErrorMessage(null);

      try {
        await me();
        const [productData, categoryItems] = await Promise.all([
          getProductById(productId),
          listCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setProduct(productData);
        setCategories(categoryItems);
        setForm(productToForm(productData));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          router.replace(`/auth?redirect=${encodeURIComponent(`/products/${productId}/edit`)}`);
          return;
        }

        setErrorMessage(error instanceof ApiError ? error.message : "Unable to load product for editing.");
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
  }, [productId, router]);



  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !product) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(false);

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
      setErrorMessage("Auction end time must be at least 10 minutes from now.");
      return;
    }

    try {
      // Upload new image to Cloudinary if one was selected
      let imageUrl: string | undefined;

      if (form.imageFile) {
        setUploadingImage(true);

        try {
          imageUrl = await uploadImageToCloudinary(form.imageFile);
        } finally {
          setUploadingImage(false);
        }
      }

      await updateProduct(productId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        deliveryLocation: form.deliveryLocation.trim(),
        imageUrl,
        startingPrice: startingPriceNumber,
        durationMinutes: durationMinutesNumber,
      });

      setSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/auth?redirect=${encodeURIComponent(`/products/${productId}/edit`)}`);
        return;
      }

      setErrorMessage(error instanceof ApiError ? error.message : "Unable to update product right now.");
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

  if (!product || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light px-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">{errorMessage ?? "Product not found."}</p>
          <Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white" href="/">
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  // Determine which image to show: new file preview > existing product image > placeholder
  const displayImageUrl = previewUrl ?? resolveImageUrl(product.imageUrl);

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link className="transition-colors hover:text-primary" href="/dashboard?tab=sales">
            My Sales
          </Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900">Edit</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Edit Listing</h1>
          <p className="mt-2 text-sm text-slate-500">Update your product details below.</p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {success && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
            <span>Product updated successfully.</span>
            <Link className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700" href={`/products/${productId}`}>
              View Product
            </Link>
          </div>
        )}

        <ProductForm
          categories={categories}
          displayImageUrl={displayImageUrl}
          form={form}
          onChange={(updates) => setForm((prev) => (prev ? { ...prev, ...updates } : prev))}
          onSubmit={handleSubmit}
          submitButtonText="Save Changes"
          submitting={submitting}
          uploadButtonText="Change image"
          uploadingImage={uploadingImage}
        />
      </main>
    </div>
  );
}
