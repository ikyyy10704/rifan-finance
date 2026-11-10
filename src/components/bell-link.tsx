import Link from "next/link";
import { Icon } from "./icons";

/** Tombol lonceng (.bell di mockup mobile, .iconbtn di mockup web) dengan titik merah bila ada yang belum dibaca. */
export function BellLink({ unread, dark = false }: { unread: number; dark?: boolean }) {
  return (
    <Link
      href="/notifikasi"
      aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      className={`relative grid h-11 w-11 flex-none place-items-center rounded-xl ${
        dark ? "bg-white/12 text-lime hover:bg-white/20" : "border border-line bg-white text-g800 hover:bg-bg"
      }`}
    >
      <Icon name="bell" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className={`absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 bg-danger px-1 text-[10.5px] font-extrabold text-white ${dark ? "border-g800" : "border-white"}`}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
