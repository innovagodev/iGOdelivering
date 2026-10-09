'use client';
import { useEffect } from 'react';

/**
 * Rende i campi `type="number"` dell'intera app più rigorosi, senza toccare i
 * 30 e più campi uno per uno.
 *
 * Un campo numerico del browser, da solo, lascia scrivere `e`, `E`, `+` e `-`
 * ("1e5", "-5") e il valore fuori dai limiti `min`/`max` resta così com'è. Qui:
 *
 *  - niente `e`, `E`, `+`; il `-` solo se il campo ammette valori negativi
 *    (`min` negativo): prezzi, quantità, tariffe e distanze non lo ammettono;
 *  - un testo incollato che non è un numero viene scartato;
 *  - la rotellina del mouse non cambia più il valore di un campo selezionato
 *    (cambiava i prezzi scorrendo la pagina);
 *  - uscendo dal campo, un valore sotto `min` o sopra `max` torna al limite.
 *
 * Usa la delega degli eventi sul documento: vale anche per i campi che compaiono
 * dopo (modali, schede).
 */
export default function NumberInputGuard() {
  useEffect(() => {
    const asNumberInput = (t: EventTarget | null): HTMLInputElement | null =>
      t instanceof HTMLInputElement && t.type === 'number' ? t : null;
    const allowsNegative = (el: HTMLInputElement) => el.min !== '' && Number(el.min) < 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = asNumberInput(e.target);
      if (!el || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
      else if (e.key === '-' && !allowsNegative(el)) e.preventDefault();
    };

    // Le tastiere dei telefoni spesso non mandano il carattere in keydown.
    const onBeforeInput = (e: InputEvent) => {
      const el = asNumberInput(e.target);
      if (!el || !e.data) return;
      if (/[eE+]/.test(e.data) || (e.data.includes('-') && !allowsNegative(el))) e.preventDefault();
    };

    const onPaste = (e: ClipboardEvent) => {
      const el = asNumberInput(e.target);
      if (!el) return;
      const text = e.clipboardData?.getData('text') ?? '';
      const ok = allowsNegative(el) ? /^\s*-?\d*[.,]?\d*\s*$/ : /^\s*\d*[.,]?\d*\s*$/;
      if (!ok.test(text)) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      const el = asNumberInput(e.target);
      if (el && document.activeElement === el) el.blur();
    };

    const setNative = (el: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, value);
      // React ascolta "input": senza questo evento lo stato resterebbe sul valore vecchio.
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const onFocusOut = (e: FocusEvent) => {
      const el = asNumberInput(e.target);
      if (!el || el.value === '') return;
      const v = parseFloat(el.value);
      if (Number.isNaN(v)) return;
      if (el.min !== '' && v < Number(el.min)) setNative(el, el.min);
      else if (el.max !== '' && v > Number(el.max)) setNative(el, el.max);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('beforeinput', onBeforeInput as EventListener, true);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('wheel', onWheel, { capture: true, passive: true });
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('beforeinput', onBeforeInput as EventListener, true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, []);

  return null;
}
