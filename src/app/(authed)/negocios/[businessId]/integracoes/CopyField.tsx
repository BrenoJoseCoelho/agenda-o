"use client";

import { useState } from "react";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable; user can still select the text manually
    }
  }

  return (
    <div className="flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input-app flex-1 font-mono text-xs" />
      <button type="button" onClick={copy} className="btn-ghost shrink-0">
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
