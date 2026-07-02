"use client";

type Preset = {
  label: string;
  tone: string;
  formality: "INFORMAL" | "NEUTRO" | "FORMAL";
  emojiLevel: "NENHUM" | "POUCO" | "BASTANTE";
};

const PRESETS: Preset[] = [
  {
    label: "Descontraido",
    tone: "Descontraida e brincalhona, fala como um amigo proximo.",
    formality: "INFORMAL",
    emojiLevel: "BASTANTE",
  },
  {
    label: "Profissional",
    tone: "Profissional, objetiva e cordial. Sem rodeios.",
    formality: "FORMAL",
    emojiLevel: "NENHUM",
  },
  {
    label: "Acolhedor",
    tone: "Calorosa e acolhedora, transmite seguranca e cuidado.",
    formality: "NEUTRO",
    emojiLevel: "POUCO",
  },
];

export default function PersonaPresets() {
  function apply(e: React.MouseEvent<HTMLButtonElement>, preset: Preset) {
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const tone = form.querySelector<HTMLTextAreaElement>('[name="tone"]');
    const formality = form.querySelector<HTMLSelectElement>('[name="formality"]');
    const emoji = form.querySelector<HTMLSelectElement>('[name="emojiLevel"]');
    if (tone) tone.value = preset.tone;
    if (formality) formality.value = preset.formality;
    if (emoji) emoji.value = preset.emojiLevel;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-2 self-center mr-1">Personas prontas:</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={(e) => apply(e, p)}
          className="text-xs px-3 py-1.5 rounded-full bd border text-2 hover:text-1 hover-surface transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
