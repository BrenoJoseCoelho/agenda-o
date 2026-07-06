"use client";

import { useRouter, usePathname } from "next/navigation";

export default function DayPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <input
      type="date"
      defaultValue={value}
      aria-label="Escolher data"
      onChange={(e) => {
        const v = e.target.value;
        if (v) router.push(`${pathname}?d=${v}`);
      }}
      className="input-app !w-auto"
    />
  );
}
