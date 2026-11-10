// Ikon dan warna yang bisa dipilih saat membuat kategori (harus ada di src/components/icons.tsx).
export const CATEGORY_ICONS = [
  "food", "coffee", "transport", "bill", "box", "cart", "heart", "shirt", "fun", "run", "mountain",
  "chart", "briefcase", "salary", "income", "other",
] as const;

export const CATEGORY_TONES = ["r", "a", "b", "g", "l"] as const;

// Nama ikon untuk pembaca layar.
export const ICON_LABEL: Record<(typeof CATEGORY_ICONS)[number], string> = {
  food: "Makanan", coffee: "Kopi", transport: "Kendaraan", bill: "Listrik", box: "Kotak", cart: "Keranjang belanja",
  heart: "Hati", shirt: "Baju", fun: "Hiburan", run: "Lari", mountain: "Gunung", chart: "Grafik naik",
  briefcase: "Tas kerja", salary: "Kartu", income: "Uang masuk", other: "Lainnya",
};

// Saran kategori tambahan yang umum untuk keuangan pribadi, bisa ditambahkan sekali tekan.
export const CATEGORY_SUGGESTIONS = [
  { name: "Kesehatan", kind: "expense", icon: "heart", color: "g" },
  { name: "Pendidikan", kind: "expense", icon: "briefcase", color: "b" },
  { name: "Pulsa & internet", kind: "expense", icon: "bill", color: "b" },
  { name: "Langganan digital", kind: "expense", icon: "fun", color: "b" },
  { name: "Perawatan kendaraan", kind: "expense", icon: "transport", color: "a" },
  { name: "Donasi & zakat", kind: "expense", icon: "heart", color: "l" },
  { name: "Hadiah", kind: "expense", icon: "box", color: "r" },
  { name: "Keluarga", kind: "expense", icon: "cart", color: "l" },
  { name: "Bonus", kind: "income", icon: "salary", color: "g" },
  { name: "Freelance", kind: "income", icon: "briefcase", color: "g" },
] as const;
