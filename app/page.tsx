import Link from "next/link";
import Sparkles from "@/components/Sparkles";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="relative text-center py-14 sm:py-20 overflow-hidden border-y border-champagne/20 bg-white/70">
        <Sparkles variant="ambient" />
        <p className="relative text-xs font-bold tracking-[0.18em] text-champagne mb-4">
          SNACK CARD COLLECTION
        </p>
        <h1 className="relative text-4xl sm:text-5xl font-display font-extrabold mb-4 text-gradient-gold">
          ポケ嬢
        </h1>
        <p className="relative text-muted text-sm leading-7">
          お店QRと嬢QRを読み取って、
          <br />
          ポケ嬢デジタルカードを集めよう。
        </p>
      </section>

      <div className="grid gap-4 max-w-md w-full mx-auto">
        <Link
          href="/collection"
          className="btn-primary px-6 py-5 text-center text-white"
        >
          コレクションを見る
        </Link>
      </div>

      <section className="surface-card px-6 py-7 sm:px-8 sm:py-8 text-xs text-muted leading-relaxed">
        <h2 className="font-bold text-ink mb-3">遊び方</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>お店QRを読むと、その店舗に在籍する嬢の全カードから1枚当たります。</li>
          <li>嬢QRを読むと、その嬢の全カードから1枚当たります。</li>
          <li>入手したカードはコレクションページで確認できます。</li>
        </ol>
      </section>
    </div>
  );
}
