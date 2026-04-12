const CONFIGURED_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

function resolveRuntimeApiBaseUrl(): string {
  if (!CONFIGURED_API_BASE_URL) {
    return "";
  }

  if (typeof window === "undefined") {
    return CONFIGURED_API_BASE_URL;
  }

  try {
    const configuredOrigin = new URL(CONFIGURED_API_BASE_URL).origin;

    // If API origin differs from frontend origin, use Next.js rewrite proxy (/api, /uploads)
    // to avoid browser CORS/session-cookie issues.
    if (configuredOrigin !== window.location.origin) {
      return "";
    }
  } catch {
    return CONFIGURED_API_BASE_URL;
  }

  return CONFIGURED_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  return resolveRuntimeApiBaseUrl();
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const responseText = await response.text();
    let body: unknown = null;

    if (responseText) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = responseText;
      }
    }

    const fallbackMessage = `Request failed with status ${response.status}`;
    const message =
      typeof body === "object" && body !== null
        ? "message" in body && typeof body.message === "string"
          ? body.message
          : "error" in body && typeof body.error === "string"
            ? body.error
            : fallbackMessage
        : fallbackMessage;

    return new ApiError(message, response.status, body);
  }
}

export type ProductCardResponse = {
  id: number;
  name: string;
  description: string;
  currentPrice: number;
  minRequiredBid: number;
  imageUrl: string | null;
  endTime: string;
  deliveryLocation: string;
  category: string;
};

export type ProductDetailsResponse = {
  id: number;
  name: string;
  description: string;
  category: string;
  deliveryLocation: string;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  startingPrice: number;
  currentPrice: number;
  minRequiredBid: number;
  leadingBidId: number | null;
};

export type SellerContactResponse = {
  firstName: string;
  lastName: string;
  mobilePhone: string;
  city: string | null;
  street: string | null;
  zipCode: string | null;
};

export type PlaceBidRequest = {
  productId: number;
  maxAmount: number;
};

export type PlaceBidResponse = {
  status: string;
  currentPrice: number;
  minRequiredMax: number | null;
  nextMinRequiredBid: number;
  message: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  mobilePhone: string;
  city?: string;
  street?: string;
  zipCode?: string;
};

export type RegisterResponse = {
  id: number;
  username: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  id: number;
  username: string;
};

export type MeResponse = {
  id: number;
  username: string;
};

export type EditProfileRequest = {
  firstName?: string;
  lastName?: string;
  mobilePhone?: string;
  city?: string;
  street?: string;
  zipCode?: string;
};

export type MeProfileResponse = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  city: string | null;
  street: string | null;
  zipCode: string | null;
};

export type MySellingProductItem = {
  productId: number;
  productName: string;
  currentPrice: number;
  endTime: string;
  deliveryLocation: string;
  imageUrl: string | null;
  status: string;
  canEdit: boolean;
  bidCount: number;
  leadingBidderId: number | null;
};

export type MyBidHistoryItem = {
  productId: number;
  productName: string;
  myMaxBid: number;
  currentPrice: number;
  endTime: string;
  deliveryLocation: string;
  imageUrl: string | null;
  status: string;
};

export type CreateProductRequest = {
  name: string;
  description?: string;
  category: string;
  deliveryLocation: string;
  imageUrl?: string;
  startingPrice: number;
  durationMinutes: number;
};

export type CreateProductResponse = {
  id: number;
  endTime: string;
};

export type UpdateProductRequest = {
  name?: string;
  description?: string;
  category?: string;
  deliveryLocation?: string;
  imageUrl?: string;
  startingPrice?: number;
  durationMinutes?: number;
};

export type ListProductsQuery = {
  category?: string;
  search?: string;
  hasImage?: boolean;
  endFrom?: string;
  endTo?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortDir?: string;
};

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  const pathWithQuery = queryString
    ? `${normalizedPath}?${queryString}`
    : normalizedPath;

  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${pathWithQuery}` : pathWithQuery;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, QueryValue>,
): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();

  if (!raw) {
    return undefined as T;
  }

  return JSON.parse(raw) as T;
}



export function listCategories(): Promise<string[]> {
  return request<string[]>("/api/categories");
}

export function listProducts(query: ListProductsQuery = {}): Promise<ProductCardResponse[]> {
  return request<ProductCardResponse[]>("/api/products", {}, query);
}

export function getProductById(id: number): Promise<ProductDetailsResponse> {
  return request<ProductDetailsResponse>(`/api/products/${id}`);
}

export function getSellerContact(id: number): Promise<SellerContactResponse> {
  return request<SellerContactResponse>(`/api/products/${id}/seller-contact`);
}

export function createProduct(payload: CreateProductRequest): Promise<CreateProductResponse> {
  return request<CreateProductResponse>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(
  id: number,
  payload: UpdateProductRequest,
): Promise<ProductDetailsResponse> {
  return request<ProductDetailsResponse>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function placeBid(payload: PlaceBidRequest): Promise<PlaceBidResponse> {
  return request<PlaceBidResponse>("/api/bids", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function me(): Promise<MeResponse> {
  return request<MeResponse>("/api/auth/me");
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", {
    method: "POST",
  });
}

export function bidsHistory(): Promise<MyBidHistoryItem[]> {
  return request<MyBidHistoryItem[]>("/api/me/bids-history");
}

export function productsSelling(): Promise<MySellingProductItem[]> {
  return request<MySellingProductItem[]>("/api/me/products-selling");
}

export function meProfile(): Promise<MeProfileResponse> {
  return request<MeProfileResponse>("/api/me/profile");
}

export function editMe(payload: EditProfileRequest): Promise<MeProfileResponse> {
  return request<MeProfileResponse>("/api/me/edit", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}



