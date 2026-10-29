'use client';

import { useRef, useState } from 'react';
import { PHOTO_BACKGROUNDS, compose, cutout, shrinkToLimit } from '@/lib/photoBackground';

const MAX_SIZE_MB = 3;
const MAX_ORIGINAL_MB = 25; // with background replacement the photo is re-encoded, so larger originals are fine

export default function ImageUploadInput({
  value,
  onChange,
  label,
  withBackground = false,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  withBackground?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [cut, setCut] = useState<Blob | null>(null);
  const [bgId, setBgId] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function applyBackground(id: string, source?: File, cached?: Blob | null) {
    const bg = PHOTO_BACKGROUNDS.find((b) => b.id === id);
    const f = source ?? file;
    if (!bg || !f) return;
    setError('');
    setBgId(id);
    try {
      let blob = cached ?? cut;
      if (!blob) {
        setBusy('در حال جدا کردن گل از پس‌زمینه… (بار اول چند دقیقه برای دریافت مدل طول می‌کشد)');
        blob = await cutout(f, (p) => setBusy(`در حال جدا کردن گل از پس‌زمینه… ${p}٪`));
        setCut(blob);
      }
      setBusy('در حال ساخت تصویر نهایی…');
      onChange(await compose(blob, bg));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'جایگزینی پس‌زمینه انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
    } finally {
      setBusy('');
    }
  }

  function resetOriginal() {
    setBgId('');
    setError('');
    if (file && original) {
      if (file.size <= MAX_SIZE_MB * 1024 * 1024) onChange(original);
      else shrinkToLimit(file).then(onChange).catch(() => setError('حجم عکس اصلی زیاد است.'));
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const limit = withBackground ? MAX_ORIGINAL_MB : MAX_SIZE_MB;

    if (picked.size > limit * 1024 * 1024) {
      alert(`حجم عکس نباید بیشتر از ${limit} مگابایت باشد. لطفاً عکس کوچک‌تری انتخاب کنید.`);
      e.target.value = '';
      return;
    }

    setFile(picked);
    setCut(null);
    setBgId('');
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setOriginal(url);
      if (picked.size <= MAX_SIZE_MB * 1024 * 1024) onChange(url);
      else shrinkToLimit(picked).then(onChange).catch(() => setError('حجم عکس اصلی زیاد است.'));
    };
    reader.readAsDataURL(picked);
  }

  return (
    <div>
      {label && <label className="block text-sm mb-1 text-ink-soft">{label}</label>}
      <div className="flex items-center gap-4">
        {value ? (
          <div
            className="w-20 h-20 rounded-md bg-cover bg-center border border-bronze/30 flex-shrink-0"
            style={{ backgroundImage: `url(${value})` }}
          />
        ) : (
          <div className="w-20 h-20 rounded-md border border-dashed border-bronze/30 flex items-center justify-center text-ink-soft text-xs flex-shrink-0">
            بدون عکس
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border border-bronze/30 px-4 py-2 rounded-sm text-sm hover:bg-ivory-deep"
          >
            {value ? 'تغییر عکس' : 'انتخاب عکس'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOriginal('');
                setFile(null);
                setCut(null);
                setBgId('');
              }}
              className="text-xs text-red-600 text-right"
            >
              حذف عکس
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
      </div>

      {withBackground && file && (
        <div className="mt-4 rounded-md border border-bronze/30 p-4 bg-ivory/50">
          <p className="text-sm mb-1">پس‌زمینه‌ی گل خان</p>
          <p className="text-xs text-ink-soft mb-3">
            یکی از پس‌زمینه‌ها را انتخاب کنید؛ گل یا گیاه از عکس جدا و با سایه‌ی طبیعی روی آن قرار می‌گیرد. می‌توانید پس‌زمینه را عوض کنید یا به عکس اصلی برگردید.
          </p>
          <div className="flex flex-wrap gap-3">
            {PHOTO_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={!!busy}
                onClick={() => applyBackground(b.id)}
                className={`w-20 text-center text-xs disabled:opacity-50 ${bgId === b.id ? 'text-ruby font-bold' : 'text-ink-soft'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.thumb}
                  alt={b.label}
                  className={`w-20 h-20 rounded-md object-cover border-2 ${bgId === b.id ? 'border-ruby' : 'border-bronze/30'}`}
                />
                <span className="block mt-1">{b.label}</span>
              </button>
            ))}
          </div>
          {busy && <p className="text-xs mt-3 text-bronze-deep">{busy}</p>}
          {error && <p className="text-xs mt-3 text-red-600">{error}</p>}
          {bgId && !busy && (
            <button type="button" onClick={resetOriginal} className="text-xs mt-3 underline text-ink-soft">
              بازگشت به عکس اصلی
            </button>
          )}
        </div>
      )}
    </div>
  );
}
