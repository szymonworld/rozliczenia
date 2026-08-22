import { useMemo } from "react";
import type { Member } from "../../shared/types";
import { formatGrosze } from "../lib/money";
import { formatPhoneDisplay, phoneDigitsOnly } from "../lib/phone";
import { buildPaymentString, buildQrSvg, isUsableIban } from "../lib/paymentQr";
import { copyText } from "../lib/share";
import { useToast } from "../context/ToastContext";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function PaySheet({
  recipient,
  amountGrosze,
  title,
  onClose,
  onMarkSent,
}: {
  recipient: Member;
  amountGrosze: number;
  title: string;
  onClose: () => void;
  onMarkSent: () => void;
}) {
  const { showToast } = useToast();

  const qrSvg = useMemo(() => {
    if (!isUsableIban(recipient.payment?.iban)) return null;
    return buildQrSvg(
      buildPaymentString({
        iban: recipient.payment!.iban!,
        amountGrosze,
        recipientName: recipient.name,
        title,
        phone: recipient.payment?.blik,
      }),
    );
  }, [recipient, amountGrosze, title]);

  const copy = async (label: string, value: string) => {
    showToast((await copyText(value)) ? `${label} skopiowany` : "Nie udało się skopiować");
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        aria-label="Zamknij"
        onClick={onClose}
        className="anim-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        className="anim-sheet relative z-10 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface px-5 pt-3"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />

        <div className="mb-5 flex items-center gap-3">
          <Avatar name={recipient.name} seed={recipient.id} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Przelew do</p>
            <p className="truncate text-lg font-semibold text-ink">{recipient.name}</p>
          </div>
          <p className="num text-xl font-bold text-ink">{formatGrosze(amountGrosze)}</p>
        </div>

        {qrSvg ? (
          <div className="mb-4">
            <div
              className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl border border-line bg-white p-3"
              // The SVG is generated locally from the ledger, never from user HTML.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-2.5 text-center text-[13px] leading-relaxed text-muted">
              Zeskanuj w aplikacji banku &mdash; kwota, numer konta i tytuł uzupełnią się same.
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
            {recipient.payment?.iban
              ? "Numer konta wygląda niepoprawnie (potrzeba 26 cyfr), więc nie da się zrobić kodu QR."
              : `Dodaj numer konta ${recipient.name} w Ustawieniach, aby generować kod QR do przelewu.`}
          </div>
        )}

        <ul className="mb-5 space-y-1">
          {recipient.payment?.blik && (
            <li className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
              <span className="w-12 shrink-0 text-[13px] text-muted">BLIK</span>
              <span className="num min-w-0 flex-1 truncate text-[15px] text-ink">
                {formatPhoneDisplay(recipient.payment.blik)}
              </span>
              <button
                aria-label="Kopiuj numer BLIK"
                onClick={() => copy("Numer BLIK", phoneDigitsOnly(recipient.payment!.blik!))}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent"
              >
                <Icon name="copy" className="h-[18px] w-[18px]" />
              </button>
            </li>
          )}
          {recipient.payment?.iban && (
            <li className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
              <span className="w-12 shrink-0 text-[13px] text-muted">Konto</span>
              <span className="num min-w-0 flex-1 truncate text-[15px] text-ink">
                {recipient.payment.iban}
              </span>
              <button
                aria-label="Kopiuj numer konta"
                onClick={() => copy("Numer konta", recipient.payment!.iban!)}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent"
              >
                <Icon name="copy" className="h-[18px] w-[18px]" />
              </button>
            </li>
          )}
        </ul>

        <button
          onClick={onMarkSent}
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "var(--shadow-lift)",
          }}
          className="press min-h-13 w-full rounded-2xl py-3.5 font-semibold text-on-accent"
        >
          Wysłane — zapisz rozliczenie
        </button>
        <p className="mt-2 pb-1 text-center text-[13px] text-muted">
          {recipient.name} potwierdzi otrzymanie w swojej aplikacji.
        </p>
      </div>
    </div>
  );
}
