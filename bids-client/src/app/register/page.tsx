"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, me, register } from "@/lib/api";
import { Brand } from "@/components/brand";

type RegisterForm = {
  firstName: string;
  lastName: string;
  username: string;
  mobilePhone: string;
  city: string;
  street: string;
  zipCode: string;
  password: string;
};

function sanitizeRedirectPath(candidate: string | null): string {
  if (!candidate) {
    return "/dashboard";
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  return candidate;
}

export default function RegisterPage() {
  const router = useRouter();
  const [redirectTarget] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    return sanitizeRedirectPath(new URLSearchParams(window.location.search).get("redirect"));
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    username: "",
    mobilePhone: "",
    city: "",
    street: "",
    zipCode: "",
    password: "",
  });

  useEffect(() => {
    let isMounted = true;

    me()
      .then(() => {
        if (isMounted) {
          router.replace(redirectTarget);
        }
      })
      .catch(() => {
        // Not authenticated - keep register page.
      });

    return () => {
      isMounted = false;
    };
  }, [redirectTarget, router]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await register({
        username: registerForm.username.trim(),
        password: registerForm.password,
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        mobilePhone: registerForm.mobilePhone.trim(),
        city: registerForm.city.trim() || undefined,
        street: registerForm.street.trim() || undefined,
        zipCode: registerForm.zipCode.trim() || undefined,
      });

      setSuccessMessage("Account created successfully. You can sign in now.");
      router.push(`/auth?username=${encodeURIComponent(registerForm.username.trim())}`);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to register right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-light p-4 text-slate-900">
      <div className="mb-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-start">
          <Link className="flex items-center text-primary" href="/">
            <Brand className="gap-3" wordmarkClassName="tracking-tight" />
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[560px] rounded-xl border border-slate-200 bg-white p-8 shadow-xl md:p-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Welcome</h2>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          </div>
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">First Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => {
                    setRegisterForm((previous) => ({ ...previous, firstName: event.target.value }));
                  }}
                  required
                  type="text"
                  value={registerForm.firstName}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => {
                    setRegisterForm((previous) => ({ ...previous, lastName: event.target.value }));
                  }}
                  required
                  type="text"
                  value={registerForm.lastName}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setRegisterForm((previous) => ({ ...previous, username: event.target.value }));
                }}
                required
                type="text"
                value={registerForm.username}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setRegisterForm((previous) => ({ ...previous, mobilePhone: event.target.value }));
                }}
                required
                type="tel"
                value={registerForm.mobilePhone}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">City</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => {
                    setRegisterForm((previous) => ({ ...previous, city: event.target.value }));
                  }}
                  type="text"
                  value={registerForm.city}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Zip Code</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => {
                    setRegisterForm((previous) => ({ ...previous, zipCode: event.target.value }));
                  }}
                  type="text"
                  value={registerForm.zipCode}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Street</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setRegisterForm((previous) => ({ ...previous, street: event.target.value }));
                }}
                type="text"
                value={registerForm.street}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                minLength={8}
                onChange={(event) => {
                  setRegisterForm((previous) => ({ ...previous, password: event.target.value }));
                }}
                required
                type="password"
                value={registerForm.password}
              />
            </div>

            <button
              className="mt-4 w-full rounded-lg bg-primary py-3.5 font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-bold text-primary hover:underline" href="/auth">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
