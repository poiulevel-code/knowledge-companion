import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createRoom } from "@/lib/game.functions";
import {
  addQuestion,
  deleteQuestion,
  getSet,
  listQuestions,
  updateQuestion,
  type QuestionRow,
} from "@/lib/questions.functions";

export const Route = createFileRoute("/sorular/$setId")({
  head: () => ({
    meta: [
      { title: "Soru Seti Düzenle — Halat Yarışı" },
      {
        name: "description",
        content: "Soru setine istediğin kadar soru ekle, düzenle veya sil; sonra bu seti sun.",
      },
      { property: "og:title", content: "Soru Seti Düzenle — Halat Yarışı" },
      { property: "og:description", content: "Soru setini hazırla ve yarışmada sun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionsPage,
});

const LETTERS = ["A", "B", "C", "D"] as const;
const SHAPES: Record<(typeof LETTERS)[number], string> = { A: "▲", B: "◆", C: "●", D: "■" };
const OPT_BG: Record<(typeof LETTERS)[number], string> = {
  A: "bg-kh-red",
  B: "bg-kh-blue",
  C: "bg-kh-yellow",
  D: "bg-kh-green",
};

const empty = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
};

function QuestionsPage() {
  const { setId } = Route.useParams();
  const navigate = useNavigate();
  const fetchAll = useServerFn(listQuestions);
  const fetchSet = useServerFn(getSet);
  const add = useServerFn(addQuestion);
  const edit = useServerFn(updateQuestion);
  const remove = useServerFn(deleteQuestion);
  const create = useServerFn(createRoom);

  const setInfo = useQuery({
    queryKey: ["set", setId],
    queryFn: () => fetchSet({ data: { id: setId } }),
  });
  const list = useQuery<QuestionRow[]>({
    queryKey: ["questions", setId],
    queryFn: () => fetchAll({ data: { setId } }),
  });

  const [form, setForm] = useState({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const set = (k: keyof typeof empty, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    const f = form as Record<string, unknown>;
    const str = (k: string) => String(f[k] ?? "").trim();
    if (!str("question")) return setError("Soru metni gerekli");
    if (!str("option_a") || !str("option_b") || !str("option_c") || !str("option_d"))
      return setError("Dört seçeneğin tamamını doldurun");
    setSaving(true);
    try {
      if (editingId) await edit({ data: { ...form, id: editingId } });
      else await add({ data: { ...form, setId } });
      setForm({ ...empty });
      setEditingId(null);
      await list.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    }
    setSaving(false);
  };

  const startContest = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await create({ data: { setId } });
      void navigate({ to: "/host/$code", params: { code: res.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yarışma başlatılamadı");
      setStarting(false);
    }
  };

  const total = list.data?.length ?? 0;

  return (
    <main className="min-h-screen bg-kh-bg px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/60">
              Soru Seti
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
              {setInfo.data?.title ?? "..."}
            </h1>
            <p className="mt-2 text-sm font-semibold text-white/60">{total} soru</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/sorular"
              className="rounded-full bg-white/10 px-5 py-3 text-sm font-extrabold text-white ring-2 ring-white/30 transition hover:bg-white/20"
            >
              SETLERE DÖN
            </Link>
            <button
              onClick={startContest}
              disabled={starting || total === 0}
              className="rounded-full bg-kh-green px-6 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_oklch(0.42_0.14_145)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
            >
              {starting ? "HAZIRLANIYOR..." : "BU SETİ SUN"}
            </button>
          </div>
        </header>

        {error && (
          <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-sm font-extrabold text-white">
            {error}
          </p>
        )}

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-[0_16px_50px_-16px_oklch(0.1_0.1_296_/_0.5)] sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-foreground">
              {editingId ? "Soruyu Düzenle" : "Yeni Soru Ekle"}
            </h2>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...empty });
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Vazgeç
              </button>
            )}
          </div>

          <textarea
            value={form.question}
            onChange={(e) => set("question", e.target.value)}
            rows={3}
            placeholder="Sorunuzu buraya yazın"
            className="mt-5 w-full resize-none rounded-2xl border-b-4 border-border bg-muted/50 px-5 py-4 text-lg font-extrabold text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-foreground/70"
          />

          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Cevap seçenekleri — doğru olanın yanındaki ✓ işaretine dokun
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {LETTERS.map((l) => {
              const correct = form.correct_answer === l;
              return (
                <div
                  key={l}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_4px_0_oklch(0.1_0.05_296_/_0.25)] ${OPT_BG[l]}`}
                >
                  <span className="w-7 shrink-0 text-center text-2xl leading-none text-white drop-shadow">
                    {SHAPES[l]}
                  </span>
                  <input
                    value={form[`option_${l.toLowerCase()}` as "option_a"]}
                    onChange={(e) =>
                      set(`option_${l.toLowerCase()}` as keyof typeof empty, e.target.value)
                    }
                    placeholder={`${l} seçeneği`}
                    className="w-full bg-transparent text-base font-extrabold text-white outline-none placeholder:text-white/70"
                  />
                  <button
                    type="button"
                    aria-label={`${l} doğru cevap`}
                    onClick={() => set("correct_answer", l)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] text-base font-extrabold transition ${
                      correct
                        ? "border-white bg-white text-foreground"
                        : "border-white/60 text-transparent hover:border-white"
                    }`}
                  >
                    ✓
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-foreground px-6 py-4 text-base font-extrabold uppercase tracking-wider text-background shadow-[0_5px_0_oklch(0.1_0.02_264)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40 sm:w-auto sm:px-10"
          >
            {saving ? "KAYDEDİLİYOR..." : editingId ? "GÜNCELLE" : "SORUYU EKLE"}
          </button>
        </section>

        <section className="mt-8 space-y-4 pb-12">
          {list.isLoading && (
            <p className="text-sm font-extrabold text-white/70">Sorular yükleniyor...</p>
          )}
          {!list.isLoading && total === 0 && (
            <p className="rounded-3xl bg-white/10 px-6 py-8 text-center text-sm font-extrabold text-white/70">
              Henüz soru yok — yukarıdan ilk sorunuzu ekle!
            </p>
          )}
          {(list.data ?? []).map((q, i) => (
            <article
              key={q.id}
              className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_-14px_oklch(0.1_0.1_296_/_0.5)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-extrabold text-muted-foreground">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-extrabold text-foreground">{q.question}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(q.id);
                      setForm({
                        question: q.question,
                        option_a: q.option_a,
                        option_b: q.option_b,
                        option_c: q.option_c,
                        option_d: q.option_d,
                        correct_answer: q.correct_answer.toUpperCase(),
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-full bg-muted px-4 py-2 text-xs font-extrabold text-foreground hover:bg-border"
                  >
                    DÜZENLE
                  </button>
                  <button
                    onClick={async () => {
                      setError(null);
                      try {
                        await remove({ data: { id: q.id } });
                        await list.refetch();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Silinemedi");
                      }
                    }}
                    className="rounded-full border-2 border-kh-red/40 px-4 py-2 text-xs font-extrabold text-kh-red hover:bg-kh-red/10"
                  >
                    SİL
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {LETTERS.map((l) => {
                  const value = q[`option_${l.toLowerCase()}` as "option_a"];
                  const correct = q.correct_answer.toUpperCase() === l;
                  return (
                    <p
                      key={l}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-white ${OPT_BG[l]} ${
                        correct ? "ring-4 ring-foreground/70" : "opacity-80"
                      }`}
                    >
                      <span className="text-base leading-none">{SHAPES[l]}</span>
                      <span className="truncate">{value}</span>
                      {correct && <span className="ml-auto shrink-0">✓</span>}
                    </p>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
