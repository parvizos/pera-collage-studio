import type { HistoryPage, HistoryRecord, Template, User } from "./types";

export interface UserCreds {
  userId: string;
  pin: string;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(`API error ${status}`);
  }
}

export const api = {
  async getTemplate(): Promise<Template> {
    return asJson<Template>(await fetch("/api/template"));
  },

  async saveTemplate(template: Template, adminPin: string): Promise<void> {
    await asJson(
      await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Pin": adminPin },
        body: JSON.stringify(template),
      }),
    );
  },

  async verifyAdmin(pin: string): Promise<boolean> {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    return res.ok;
  },

  async getUsers(): Promise<User[]> {
    const data = await asJson<{ users: User[] }>(await fetch("/api/users"));
    return data.users;
  },

  async saveUsers(users: User[], adminPin: string): Promise<User[]> {
    const data = await asJson<{ users: User[] }>(
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Pin": adminPin },
        body: JSON.stringify({ users }),
      }),
    );
    return data.users;
  },

  async listCollages(params: Record<string, string | number>): Promise<HistoryPage> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    return asJson<HistoryPage>(await fetch(`/api/collages?${qs.toString()}`));
  },

  async getCollage(id: string, opts: { brandSlug?: string; userId?: string } = {}): Promise<HistoryRecord> {
    const qs = new URLSearchParams({ id });
    if (opts.brandSlug) qs.set("brandSlug", opts.brandSlug);
    if (opts.userId) qs.set("userId", opts.userId);
    const data = await asJson<{ record: HistoryRecord }>(await fetch(`/api/collages?${qs.toString()}`));
    return data.record;
  },

  async saveCollage(payload: unknown, creds: UserCreds): Promise<HistoryRecord> {
    const data = await asJson<{ record: HistoryRecord }>(
      await fetch("/api/collages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": creds.userId,
          "X-User-Pin": creds.pin,
        },
        body: JSON.stringify(payload),
      }),
    );
    return data.record;
  },

  async deleteCollages(
    records: { id: string; brandSlug?: string; userId?: string }[],
    adminPin: string,
  ): Promise<string[]> {
    const data = await asJson<{ deletedIds: string[] }>(
      await fetch("/api/collages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Pin": adminPin },
        body: JSON.stringify({ records }),
      }),
    );
    return data.deletedIds;
  },

  // ---- Storefront ----
  async getPublishedIds(adminPin: string): Promise<string[]> {
    const data = await asJson<{ ids: string[] }>(
      await fetch("/api/store/published-ids", { headers: { "X-Admin-Pin": adminPin } }),
    );
    return data.ids;
  },

  async publishToStore(
    record: { id: string; brandSlug?: string; userId?: string },
    published: boolean,
    adminPin: string,
  ): Promise<string[]> {
    const data = await asJson<{ ids: string[] }>(
      await fetch("/api/store/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Pin": adminPin },
        body: JSON.stringify({ ...record, published }),
      }),
    );
    return data.ids;
  },

  async getStoreProducts(
    params: Record<string, string> = {},
  ): Promise<{ products: StoreProduct[]; categories: string[]; total: number }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    return asJson(await fetch(`/api/store/products?${qs.toString()}`));
  },

  async getStoreProduct(id: string): Promise<StoreProduct> {
    const data = await asJson<{ product: StoreProduct }>(
      await fetch(`/api/store/product?id=${encodeURIComponent(id)}`),
    );
    return data.product;
  },
};

export interface StoreProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  color: string;
  size: string;
  price: string;
  brandName: string;
  photos: string[];
  collageImage: string;
  createdAt?: string;
}
