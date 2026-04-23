import { ChangeEvent, FormEvent, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type ProductFormState = {
  name: string;
  description: string;
  category: string;
  deliveryLocation: string;
  startingPrice: string;
  endDate: Date | null;
  endTime: Date | null;
  imageFile: File | null;
  removeImage: boolean;
};

type ProductFormProps = {
  form: ProductFormState;
  categories: string[];
  submitting: boolean;
  uploadingImage: boolean;
  displayImageUrl: string | null;
  submitButtonText: string;
  uploadButtonText: string;
  onChange: (updates: Partial<ProductFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

export function ProductForm({
  form,
  categories,
  submitting,
  uploadingImage,
  displayImageUrl,
  submitButtonText,
  uploadButtonText,
  onChange,
  onSubmit,
}: ProductFormProps) {
  const minDateConfig = useMemo(() => new Date(), []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onChange({ imageFile: file, removeImage: false });
  }

  return (
    <form className="grid grid-cols-1 gap-6 lg:grid-cols-12" onSubmit={onSubmit}>
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="name">
            Product Name
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="name"
            maxLength={120}
            onChange={(event) => onChange({ name: event.target.value })}
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
            onChange={(event) => onChange({ description: event.target.value })}
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
              onChange={(event) => onChange({ category: event.target.value })}
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
              onChange={(event) => onChange({ deliveryLocation: event.target.value })}
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
                onChange={(event) => onChange({ startingPrice: event.target.value })}
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
                onChange={(date: Date | null) => onChange({ endDate: date })}
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
                onChange={(date: Date | null) => onChange({ endTime: date })}
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
          {form.imageFile ? "Replace image" : uploadButtonText}
        </label>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {displayImageUrl ? (
            <button
              aria-label="Remove image"
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-red-50 hover:text-red-700 hover:ring-red-200"
              onClick={() => onChange({ imageFile: null, removeImage: true })}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          ) : null}

          {displayImageUrl ? (
            <img alt="Preview" className="aspect-[4/3] w-full object-cover" src={displayImageUrl} />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
            </div>
          )}
        </div>

        <button
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={submitting || uploadingImage}
          type="submit"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {uploadingImage ? "Uploading Image..." : submitting ? "Saving..." : submitButtonText}
        </button>
      </section>
    </form>
  );
}
