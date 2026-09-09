export default function Avatar({ name, size = "sm" }) {
  const box = size === "md" ? "h-8 w-8 text-meta" : "h-6 w-6 text-micro";
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full
                  bg-brand-soft font-semibold text-brand`}
    >
      {(name || "?").slice(0, 2).toUpperCase()}
    </span>
  );
}
