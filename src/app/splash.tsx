"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandText, LogoMark } from "@/components/brand";

const SEEN_KEY = "rf_splash_seen";
const MIN_FILL_MS = 1400; // bar tidak boleh penuh lebih cepat dari ini, supaya animasinya terbaca
const MAX_WAIT_MS = 8000; // bila ada langkah yang macet, tetap lanjut ke login
const EXIT_MS = 320;

/**
 * Splash dengan bar 0 sampai 100%. Persentase mengikuti tiga hal yang benar-benar dimuat
 * (font, logo, respons server untuk halaman login); angka tampil dihaluskan dan tidak pernah
 * melewati progres nyata. Tampil sekali per sesi browser.
 */
export function Splash() {
  const router = useRouter();
  const logoRef = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    router.prefetch("/login");
    // Tanda "sudah tampil" baru ditulis saat splash selesai (lihat tick), supaya effect yang
    // dijalankan dua kali (React Strict Mode di dev) tidak membuat splash langsung terlewati.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // sessionStorage bisa diblokir (mode privat); splash tetap jalan.
    }
    if (seen) {
      router.replace("/login");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sekali saat mount untuk menyembunyikan splash yang sudah pernah tampil
      setSkip(true);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    const add = (n: number) => {
      target.current = Math.min(100, target.current + n);
    };

    // Tiga langkah nyata. Gagal pun dihitung selesai, supaya splash tidak tertahan.
    document.fonts.ready.then(() => add(35), () => add(35));
    const img = logoRef.current?.querySelector("img");
    (img ? img.decode() : Promise.resolve()).then(() => add(35), () => add(35));
    fetch("/login", { method: "HEAD", cache: "no-store" }).then(() => add(30), () => add(30));
    const fallback = setTimeout(() => (target.current = 100), MAX_WAIT_MS);

    // Angka tampil mengejar progres nyata dengan kecepatan maksimum tertentu.
    let value = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (cancelled) return;
      const dt = now - last;
      last = now;
      const maxStep = reduced ? 100 : (dt / MIN_FILL_MS) * 100;
      // Melambat sedikit saat mendekati target (ease-out), tapi tidak melebihi batas kecepatan.
      const gap = target.current - value;
      value = Math.min(target.current, value + Math.min(maxStep, Math.max(gap * 0.12, maxStep * 0.35)));
      setShown(value);
      if (value >= 100) {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {}
        setLeaving(true);
        setTimeout(() => !cancelled && router.replace("/login"), reduced ? 0 : EXIT_MS);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [router]);

  const pct = Math.round(shown);

  return (
    // Latar hijau tetap; hanya isi yang memudar, supaya tidak berkedip putih sebelum halaman login.
    <main className="on-dark grid min-h-dvh place-items-center bg-g800 px-4">
      <div
        className={`flex flex-col items-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
          leaving || skip ? "-translate-y-1 opacity-0" : "opacity-100"
        }`}
      >
        <div ref={logoRef} className="rf-rise">
          <LogoMark size={144} priority />
        </div>
        <h1 className="rf-fade mt-5 mb-0 text-[22px]">
          <BrandText />
        </h1>

        <div className="rf-fade-late mt-9 w-[200px]">
          <div
            role="progressbar"
            aria-label="Memuat Rifan Finance"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1.5 overflow-hidden rounded-full bg-white/15"
          >
            {/* scaleX, bukan width: animasi di GPU, tidak memicu layout ulang tiap frame. */}
            <div className="h-full w-full origin-left rounded-full bg-lime" style={{ transform: `scaleX(${shown / 100})` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-xs font-semibold text-soft tabular-nums" aria-hidden="true">
            <span>{pct < 100 ? "Memuat" : "Siap"}</span>
            <span className="text-lime">{pct}%</span>
          </div>
        </div>
      </div>
      <noscript>
        <a href="/login" className="mt-6 block font-bold text-lime underline">
          Lanjut ke halaman masuk
        </a>
      </noscript>
    </main>
  );
}
