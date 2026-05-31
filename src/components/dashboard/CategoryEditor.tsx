"use client";

import { useState } from "react";
import type { FieldType } from "@prisma/client";

interface Field {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  fields: Field[];
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text",
  NUMBER: "Nummer",
  SELECT: "Val",
  BOOLEAN: "Ja/Nej",
};

export function CategoryEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldDrafts, setFieldDrafts] = useState<
    Record<string, { label: string; type: FieldType; required: boolean; options: string }>
  >({});

  if (!loaded) {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoaded(true);
      });
    return <div className="h-32 animate-pulse rounded-md bg-gray-100" />;
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewCatName("");
      setNewCatDesc("");
    }
    setSaving(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Ta bort kategori?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id));
    else {
      const err = await res.json();
      alert(err.error);
    }
  }

  async function addField(categoryId: string) {
    const draft = fieldDrafts[categoryId];
    if (!draft?.label.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/categories/${categoryId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: draft.label,
        label: draft.label,
        type: draft.type,
        required: draft.required,
        options: draft.type === "SELECT"
          ? draft.options.split(",").map((o) => o.trim()).filter(Boolean)
          : [],
      }),
    });
    if (res.ok) {
      const field = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, fields: [...c.fields, field] } : c
        )
      );
      setFieldDrafts((prev) => ({ ...prev, [categoryId]: { label: "", type: "TEXT", required: true, options: "" } }));
    }
    setSaving(false);
  }

  async function removeField(categoryId: string, fieldId: string) {
    const res = await fetch(`/api/categories/${categoryId}/fields/${fieldId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, fields: c.fields.filter((f) => f.id !== fieldId) }
            : c
        )
      );
    } else {
      const err = await res.json();
      alert(err.error);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-gray-900">Ärendekategorier</h2>
      <p className="mb-5 text-sm text-gray-500">
        Definiera kategorier och vilka fält AI:n ska samla in per kategori.
      </p>

      {/* Befintliga kategorier */}
      <div className="mb-6 space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-gray-400">Inga kategorier ännu.</p>
        )}
        {categories.map((cat) => {
          const draft = fieldDrafts[cat.id] ?? { label: "", type: "TEXT" as FieldType, required: true, options: "" };
          const isOpen = expanded === cat.id;

          return (
            <div key={cat.id} className="rounded-md border border-gray-200">
              {/* Kategori-header */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => setExpanded(isOpen ? null : cat.id)}
                >
                  <span className="font-medium text-gray-900">{cat.name}</span>
                  {cat.description && (
                    <span className="text-sm text-gray-400">{cat.description}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">
                    {cat.fields.length} fält
                  </span>
                  <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="ml-3 text-sm text-red-400 hover:text-red-600"
                >
                  Ta bort
                </button>
              </div>

              {/* Fält-editor */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4">
                  {/* Befintliga fält */}
                  {cat.fields.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {cat.fields.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-gray-800">{f.label}</span>
                          <div className="flex items-center gap-3 text-gray-400">
                            <span>{FIELD_TYPE_LABELS[f.type]}</span>
                            {f.required && (
                              <span className="text-xs text-amber-600">Obligatorisk</span>
                            )}
                            <button
                              onClick={() => removeField(cat.id, f.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nytt fält */}
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="flex-1 min-w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Fältnamn (t.ex. Lägenhetsnummer)"
                      value={draft.label}
                      onChange={(e) =>
                        setFieldDrafts((prev) => ({
                          ...prev,
                          [cat.id]: { ...draft, label: e.target.value },
                        }))
                      }
                    />
                    <select
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      value={draft.type}
                      onChange={(e) =>
                        setFieldDrafts((prev) => ({
                          ...prev,
                          [cat.id]: { ...draft, type: e.target.value as FieldType },
                        }))
                      }
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                    {draft.type === "SELECT" && (
                      <input
                        className="flex-1 min-w-40 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="Alternativ, kommaseparerade"
                        value={draft.options}
                        onChange={(e) =>
                          setFieldDrafts((prev) => ({
                            ...prev,
                            [cat.id]: { ...draft, options: e.target.value },
                          }))
                        }
                      />
                    )}
                    <label className="flex items-center gap-1.5 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={draft.required}
                        onChange={(e) =>
                          setFieldDrafts((prev) => ({
                            ...prev,
                            [cat.id]: { ...draft, required: e.target.checked },
                          }))
                        }
                      />
                      Obligatorisk
                    </label>
                    <button
                      onClick={() => addField(cat.id)}
                      disabled={saving || !draft.label.trim()}
                      className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
                    >
                      + Lägg till fält
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ny kategori */}
      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Ny kategori</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Namn (t.ex. Vattenläcka)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <input
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Beskrivning (valfri)"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
          <button
            onClick={addCategory}
            disabled={saving || !newCatName.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            Skapa
          </button>
        </div>
      </div>
    </div>
  );
}
