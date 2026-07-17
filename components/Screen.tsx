import { ReactNode } from "react";

/**
 * Screen — mobile-first layout wrapper.
 * Centers a 430px phone column on a neutral desktop frame (DESIGN §3.3:
 * 20px horizontal padding, min-h-dvh). On desktop the outer page reads as
 * a phone column against --bg-page.
 *
 * `fill` (default true) keeps the column at min-height:100dvh so short pages
 * still paint edge-to-edge. Pass `fill={false}` when the page should end at
 * its last section (e.g. the Detail screen's disclaimer) — both the outer
 * frame and inner column drop the min-height so no empty strip is left
 * below the content.
 */
export function Screen({
  children,
  fill = true,
}: {
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div
      className="flex w-full justify-center bg-[var(--bg-page)]"
      style={{ minHeight: fill ? "100dvh" : undefined }}
    >
      <div
        className="w-full max-w-[430px] px-5"
        style={{ minHeight: fill ? "100dvh" : undefined, background: "var(--bg-light)" }}
      >
        {children}
      </div>
    </div>
  );
}
