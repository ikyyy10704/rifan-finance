"use client";

import { useEffect, useState, useTransition } from "react";
import { AmountInput } from "@/components/amount-input";
import { darkButton, errorBox, fieldInput, fieldLabel, okBox, secondaryButton } from "@/components/ui";
import { markAllNotificationsRead, removePushSubscription, savePushSubscription, saveNotifyPrefs, sendTestPush } from "@/lib/actions/notifications";
import { ALERT_KINDS, type NotifyPrefs } from "@/lib/alert-kinds";

/** Tandai semua sudah dibaca setelah halaman dibuka (isi daftar sudah diambil sebelumnya, jadi sorotan "baru" tetap tampil). */
export function MarkRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread > 0) void markAllNotificationsRead();
  }, [unread]);
  return null;
}

const b64ToUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type PushState = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function PushToggle({ vapidPublicKey, devices }: { vapidPublicKey: string | null; devices: number }) {
  const [state, setState] = useState<PushState>("checking");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      setMsg({});
      if (!vapidPublicKey) return setMsg({ error: "Push belum disiapkan di server. Jalankan npm run push:keys lalu nyalakan ulang server." });
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState(perm === "denied" ? "denied" : "off");
          return setMsg({ error: "Izin notifikasi tidak diberikan." });
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapidPublicKey) });
        const res = await savePushSubscription(sub.toJSON());
        if (res.error) return setMsg({ error: res.error });
        setState("on");
        setMsg({ ok: "Notifikasi aktif di perangkat ini." });
      } catch (e) {
        // Mis. mode penyamaran/incognito (Push API tidak tersedia) atau layanan push browser tidak bisa dihubungi.
        setMsg({
          error: `Browser menolak mendaftarkan notifikasi${e instanceof Error && e.message ? ` (${e.message})` : ""}. Jangan pakai mode penyamaran, lalu coba lagi.`,
        });
      }
    });

  const disable = () =>
    start(async () => {
      setMsg({});
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
        setMsg({ ok: "Notifikasi dimatikan di perangkat ini." });
      } catch {
        setMsg({ error: "Gagal mematikan notifikasi. Coba lagi." });
      }
    });

  const test = () =>
    start(async () => {
      setMsg({});
      setMsg(await sendTestPush());
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <b className="block text-sm">Notifikasi di perangkat ini</b>
          <small className="text-xs text-muted">
            {state === "on" && "Aktif. Peringatan dikirim setiap hari pukul 07.00 WIB."}
            {state === "off" && "Mati. Aktifkan supaya peringatan muncul di HP walau aplikasi tertutup."}
            {state === "checking" && "Memeriksa..."}
            {state === "denied" && "Diblokir di pengaturan browser. Izinkan notifikasi untuk situs ini, lalu muat ulang."}
            {state === "unsupported" && "Browser ini tidak mendukung notifikasi push. Peringatan tetap tampil di halaman ini."}
            {state === "ios-install" && "Di iPhone, pasang dulu ke layar utama: tombol Bagikan, lalu Tambah ke Layar Utama. Buka dari ikonnya, lalu aktifkan di sini."}
          </small>
          {devices > 0 && <small className="block text-xs text-muted">{devices} perangkat terdaftar untuk akun ini.</small>}
        </div>
        {state === "off" && (
          <button type="button" disabled={busy} onClick={enable} className={darkButton}>
            {busy ? "Mengaktifkan..." : "Aktifkan"}
          </button>
        )}
        {state === "on" && (
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={test} className={secondaryButton}>
              Kirim uji
            </button>
            <button type="button" disabled={busy} onClick={disable} className="inline-flex h-11 items-center rounded-xl px-3 text-[13px] font-bold text-danger hover:bg-danger-bg">
              Matikan
            </button>
          </div>
        )}
      </div>
      {msg.ok && (
        <p role="status" className={`${okBox} m-0`}>
          {msg.ok}
        </p>
      )}
      {msg.error && (
        <p role="alert" className={`${errorBox} m-0`}>
          {msg.error}
        </p>
      )}
    </div>
  );
}

export function AlertPrefs({ prefs }: { prefs: NotifyPrefs }) {
  const [kinds, setKinds] = useState(prefs.kinds);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("lowBalance") ?? "");
        const lowBalance = Number(raw.replace(/\D/g, "") || "0");
        start(async () => {
          const res = await saveNotifyPrefs({ lowBalance, kinds });
          setMsg(res.error ? { error: res.error } : { ok: "Pengaturan disimpan. Berlaku untuk peringatan berikutnya." });
        });
      }}
      className="flex flex-col gap-3"
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className={fieldLabel}>Peringatan yang dikirim</legend>
        <ul className="m-0 list-none divide-y divide-line p-0">
          {ALERT_KINDS.map((k) => (
            <li key={k.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={kinds[k.id]}
                  onChange={(e) => setKinds((s) => ({ ...s, [k.id]: e.target.checked }))}
                  className="h-5 w-5 flex-none accent-g800"
                />
                {k.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div>
        <label htmlFor="low-balance" className={fieldLabel}>
          Batas saldo rendah per akun
        </label>
        <AmountInput id="low-balance" name="lowBalance" defaultValue={prefs.lowBalance} className={fieldInput} />
        <small className="mt-1 block text-xs text-muted">Isi Rp0 untuk mematikan peringatan saldo rendah.</small>
      </div>
      {msg.ok && (
        <p role="status" className={`${okBox} m-0`}>
          {msg.ok}
        </p>
      )}
      {msg.error && (
        <p role="alert" className={`${errorBox} m-0`}>
          {msg.error}
        </p>
      )}
      <button type="submit" disabled={saving} className={darkButton}>
        {saving ? "Menyimpan..." : "Simpan pengaturan"}
      </button>
    </form>
  );
}
