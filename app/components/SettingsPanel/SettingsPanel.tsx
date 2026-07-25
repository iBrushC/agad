"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

type Theme = "light" | "auto";

type SettingsPanelProps = {
  width: number;
  onWidthChange: (width: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  fontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
  fontSize: number;
  onFontSizeChange: (fontSize: number) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
};

const FONT_FAMILIES = [
  { value: "system", label: "System Sans" },
  { value: "serif", label: "Editorial Serif" },
  { value: "mono", label: "Monospace" },
];

export default function SettingsPanel({
  width,
  onWidthChange,
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  textColor,
  onTextColorChange,
  backgroundColor,
  onBackgroundColorChange,
}: SettingsPanelProps) {
  return (
    <aside
      className="flex h-full shrink-0 flex-col border-l border-border bg-panel"
      style={{ width }}
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Page styles</h2>
        <p className="text-xs text-muted-foreground">Adjust the generated page</p>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-4 py-4">
          <Section title="Typography">
            <Field label="Font family">
              <Select value={fontFamily} onValueChange={(value) => onFontFamilyChange(value as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Base font size" value={`${fontSize}px`}>
              <Slider
                value={[fontSize]}
                min={12}
                max={24}
                step={1}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next === "number") onFontSizeChange(next);
                }}
              />
            </Field>
          </Section>

          <Separator />

          <Section title="Colors">
            <ColorField label="Text" value={textColor} onChange={onTextColorChange} />
            <ColorField
              label="Background"
              value={backgroundColor}
              onChange={onBackgroundColorChange}
            />
          </Section>

          <Separator />

          <Section title="Appearance">
            <Field label="Theme">
              <Select value={theme} onValueChange={(value) => onThemeChange(value as Theme)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="auto">System</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Separator />

          <Section title="Panel">
            <Field label="Width" value={`${width}px`}>
              <Slider
                value={[width]}
                min={240}
                max={520}
                step={10}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next === "number") onWidthChange(next);
                }}
              />
            </Field>
          </Section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {value ? <span className="font-mono text-[10px] text-muted-foreground">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `color-${label.toLowerCase()}`;

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-10 shrink-0 cursor-pointer p-1"
          aria-label={`${label} color`}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs uppercase"
          aria-label={`${label} color value`}
        />
      </div>
    </Field>
  );
}
