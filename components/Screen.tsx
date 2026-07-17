import { ReactNode } from "react";

/**
 * Screen — mobile-first layout wrapper.
 * Centers a 430px phone column on a neutral desktop frame (DESIGN §3.3:
 * 20px horizontal padding, min-h-dvh). On desktop the outer page reads as
 * a phone column against --bg-page.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div
        className="flex w-full justify-center bg-[var(--bg-page)]"
        style={{ minHeight: "100dvh" }}
    >
      <div
        className="w-full max-w-[430px] px-5"
        style={{ minHeight: "100dvh", background: "var(--bg-light)" }}
      >
        {children}
      </div>
    </div>
  );
}
