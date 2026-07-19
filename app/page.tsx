import Link from "next/link";
import Sparkles from "@/components/Sparkles";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="relative text-center py-10 overflow-hidden">
        <Sparkles variant="ambient" />
        <h1 className="relative text-4xl font-display font-extrabold mb-2 text-gradient-gold">
          ポケ嬢
        </h1>
        <p className="relative text-white/70 text-sm">
          お店QRと嬢QRを読み取って、
          <br />
          ポケ嬢デジタルカードを集めよう。
        </p>
      </section>

      <div className="grid gap-4">
        <Link
          href="/collection"
          className="btn-primary rounded-xl px-6 py-5 text-center text-white"
        >
          🗂 コレクションを見る
        </Link>
      </div>

      <section className="mt-6 text-xs text-white/50 leading-relaxed">
        <h2 className="font-bold text-white/70 mb-1">遊び方</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>お店QRを読むと、その店舗に在籍する嬢の全カードから1枚当たります。</li>
          <li>嬢QRを読むと、その嬢の全カードから1枚当たります。</li>
          <li>入手したカードはコレクションページで確認できます。</li>
        </ol>
      </section>
    </div>
  );
}
