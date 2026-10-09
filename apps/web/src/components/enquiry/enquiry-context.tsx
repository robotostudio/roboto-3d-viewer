"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** A product line in the enquiry. Keyed by product and version. */
export interface EnquiryItem {
  key: string;
  slug: string;
  title: string;
  category?: string | null;
  image?: { id: string; preview?: string | null; alt?: string | null } | null;
  version?: { id: string; label: string } | null;
  quantity: number;
}

export type NewEnquiryItem = Omit<EnquiryItem, "key" | "quantity">;

interface EnquiryContextValue {
  items: EnquiryItem[];
  /** Total units across lines. */
  count: number;
  /** False until the saved list has been read, so the badge can't flash. */
  isHydrated: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: NewEnquiryItem, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "roboto-enquiry";
export const MAX_QUANTITY = 99;

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

const clamp = (quantity: number) =>
  Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity) || 1));

export const enquiryKey = (slug: string, versionId?: string | null) =>
  `${slug}:${versionId || "default"}`;

function isItem(value: unknown): value is EnquiryItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.key === "string" &&
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.quantity === "number"
  );
}

function read(): EnquiryItem[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

function write(items: EnquiryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): the list still works this visit.
  }
}

/**
 * The enquiry list (a quote cart without prices), saved in localStorage so
 * it survives reloads and stays in step across tabs. Starts empty and reads
 * storage after mount, so server and first client render always match.
 */
export function EnquiryProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<EnquiryItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(read());
    setIsHydrated(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setItems(read());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      write(items);
    }
  }, [items, isHydrated]);

  const add = useCallback((item: NewEnquiryItem, quantity = 1) => {
    const key = enquiryKey(item.slug, item.version?.id);
    setItems((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key
            ? { ...line, quantity: clamp(line.quantity + quantity) }
            : line
        );
      }
      return [...current, { ...item, key, quantity: clamp(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      current.map((line) =>
        line.key === key ? { ...line, quantity: clamp(quantity) } : line
      )
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<EnquiryContextValue>(
    () => ({
      items,
      count: items.reduce((total, line) => total + line.quantity, 0),
      isHydrated,
      isOpen,
      open,
      close,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, isHydrated, isOpen, open, close, add, setQuantity, remove, clear]
  );

  return (
    <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>
  );
}

export function useEnquiry(): EnquiryContextValue {
  const context = useContext(EnquiryContext);
  if (!context) {
    throw new Error("useEnquiry must be used inside <EnquiryProvider>");
  }
  return context;
}
