import Link from "next/link";
import React from "react";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-display text-slate-800">
      {/* Hero Section */}
      <section className="bg-primary px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">How Our Bidding System Works</h1>
          <p className="text-lg text-blue-100 md:text-xl">
            The complete guide to Proxy Bidding - so you can buy with peace of mind, without constantly worrying someone will outbid you at the last second.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-12">
          
          {/* Section 1: Introduction */}
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 md:p-12">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-primary">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900">What is Proxy Bidding?</h2>
                <p className="leading-relaxed text-slate-600">
                  Proxy Bidding is a smart auction system designed to save you time and prevent frustration. Instead of returning to the site every five minutes to check if someone bid exactly one dollar more than you, you simply tell our system: <strong>&quot;This is the maximum price I am willing to pay for this item&quot;</strong>.
                </p>
                <p className="mt-3 leading-relaxed text-slate-600">
                  That&apos;s it! From now on, our system will automatically compete on your behalf, always bidding the lowest possible amount necessary to keep you in the lead.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: How it works step by step */}
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 md:p-12">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">How does it actually work?</h2>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">1</div>
                <h3 className="mb-2 font-bold text-slate-900">Decide your budget</h3>
                <p className="text-sm text-slate-600">Decide in advance what the highest amount you are willing to spend on the item is, and enter it into the bidding field.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">2</div>
                <h3 className="mb-2 font-bold text-slate-900">The system represents you</h3>
                <p className="text-sm text-slate-600">If someone offers an amount lower than your maximum limit, the system will immediately place a slightly higher bid on your behalf to keep you in the lead.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600">3</div>
                <h3 className="mb-2 font-bold text-slate-900">Pay only what&apos;s needed</h3>
                <p className="text-sm text-slate-600">Even if you set a maximum limit of $1000, if the next highest bidder stops at $500 - you will only end up paying $501!</p>
              </div>
            </div>
          </div>

          {/* Section 3: FAQ / Benefits */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-lg md:p-12">
             <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-amber-400">gpp_good</span>
                <h2 className="text-2xl font-bold">Why is this the winning method?</h2>
             </div>
            
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="material-symbols-outlined shrink-0 text-emerald-400">check_circle</span>
                <div>
                  <h4 className="font-bold text-white">It saves a lot of time</h4>
                  <p className="mt-1 text-slate-300 text-sm">No need to sit there refreshing the page and waiting for the final minutes of the auction. Just place your bid and go about your day.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined shrink-0 text-amber-400">savings</span>
                <div>
                  <h4 className="font-bold text-white">Protects against &quot;ego wars&quot; over price</h4>
                  <p className="mt-1 text-slate-300 text-sm">When you set a maximum in advance based on the real value of the item, you avoid getting carried away during the auction and paying more than you planned.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="material-symbols-outlined shrink-0 text-blue-400">privacy_tip</span>
                <div>
                  <h4 className="font-bold text-white">No one sees your maximum</h4>
                  <p className="mt-1 text-slate-300 text-sm">Your maximum bid is completely hidden. Competitors only see the current (lower) price needed to surpass them.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Back navigation */}
        <div className="mt-12 text-center">
          <Link 
            className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-300"
            href="/"
          >
            <span className="material-symbols-outlined" style={{ rotate: "180deg" }}>arrow_forward</span>
            Back to Home Page
          </Link>
        </div>
      </main>
    </div>
  );
}
