import { useMemo, useState } from 'react';
import {
  Github,
  Network,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  CornerDownRight,
  AlertTriangle,
  PauseCircle,
} from 'lucide-react';
import { simulate, STEP_COUNT, REPLICAS, type Mode, type ReplicaState } from './sim';

const REPLICA_COLOR = ['text-p0 border-p0/40', 'text-p1 border-p1/40', 'text-p2 border-p2/40'];
const REPLICA_DOT = ['bg-p0', 'bg-p1', 'bg-p2'];

export default function App() {
  const [mode, setMode] = useState<Mode>('EC');
  const [step, setStep] = useState(-1); // -1 = estado inicial (nada aplicado)

  const state = useMemo(() => simulate(mode, step), [mode, step]);
  const atEnd = step >= STEP_COUNT - 1;

  function changeMode(m: Mode) {
    setMode(m);
    setStep(-1); // o comportamento difere por modo: reinicia
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-p0/15 text-p0">
              <Network size={18} />
            </span>
            <div>
              <h1 className="font-700 leading-tight">Consistência Distribuída</h1>
              <p className="text-[0.7rem] text-muted">Eventual vs. Causal · Vector Clocks</p>
            </div>
          </div>
          <a
            href="https://github.com/LeonardoPCavalcanti/distributed-twitter-consistency"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-p0/40 hover:text-white"
          >
            <Github size={16} /> <span className="hidden sm:inline">Código</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted">
          Três réplicas (P0, P1, P2) de um micro-blog distribuído. P0 publica um post; P1 responde.
          A resposta chega <strong className="text-white">rápido</strong> em P2, mas o post pai chega{' '}
          <strong className="text-white">devagar</strong>. Avance passo a passo e compare os modos:
          em <strong className="text-p2">EC</strong> surge uma <em>reply órfã</em>; em{' '}
          <strong className="text-green">CC</strong> o Vector Clock detecta a dependência e{' '}
          <em>bufferiza</em> até o pai chegar.
        </p>

        {/* Controles */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex rounded-lg border border-line p-0.5">
            <ModeBtn active={mode === 'EC'} onClick={() => changeMode('EC')} label="Eventual (EC)" />
            <ModeBtn active={mode === 'CC'} onClick={() => changeMode('CC')} label="Causal (CC)" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(-1, s - 1))}
              disabled={step < 0}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
              aria-label="Passo anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[5.5rem] text-center font-mono text-sm text-muted">
              passo {step + 1}/{STEP_COUNT}
            </span>
            <button
              onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
              disabled={atEnd}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-p0/40 bg-p0/10 px-4 font-600 text-p0 transition-colors hover:bg-p0/20 disabled:opacity-30"
            >
              Próximo <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setStep(-1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-white/30 hover:text-white"
              aria-label="Reiniciar"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Réplicas */}
        <div className="grid gap-4 md:grid-cols-3">
          {state.replicas.map((r, i) => (
            <ReplicaPanel key={i} idx={i} replica={r} mode={mode} />
          ))}
        </div>

        {/* Narração */}
        <section className="mt-6 rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-[0.7rem] font-600 uppercase tracking-wider text-muted">
            Narração do que aconteceu
          </h2>
          {state.log.length === 0 ? (
            <p className="text-sm text-muted">Clique em “Próximo” para iniciar a simulação.</p>
          ) : (
            <ol className="space-y-1.5">
              {state.log.map((line, i) => (
                <li
                  key={i}
                  className={`font-mono text-xs leading-relaxed ${i === state.log.length - 1 ? 'text-white' : 'text-muted'}`}
                >
                  {i === state.log.length - 1 ? '▸ ' : '  '}
                  {line}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Conclusão ao final */}
        {atEnd && (
          <section
            className={`mt-4 rounded-xl border p-5 ${mode === 'EC' ? 'border-p2/40 bg-p2/10' : 'border-green/40 bg-green/10'}`}
          >
            <h2 className="flex items-center gap-2 font-600">
              {mode === 'EC' ? (
                <>
                  <AlertTriangle size={18} className="text-p2" /> Eventual: P2 mostrou a resposta sem
                  o post pai
                </>
              ) : (
                <>
                  <CornerDownRight size={18} className="text-green" /> Causal: P2 bufferizou a
                  resposta até o pai chegar
                </>
              )}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {mode === 'EC'
                ? 'Como a entrega segue só a ordem de chegada, a reply de P1 apareceu em P2 antes do post de P0 — uma reply órfã. As réplicas convergem no fim, mas exibiram um estado causalmente inconsistente no caminho.'
                : 'O Vector Clock da reply indicava dependência de um evento de P0 ainda não visto por P2. Em vez de exibir uma reply órfã, P2 a reteve no buffer e só a entregou após receber o post pai — preservando a ordem causal.'}
            </p>
          </section>
        )}

        {/* Legenda Vector Clock */}
        <section className="mt-4 rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-2 text-[0.7rem] font-600 uppercase tracking-wider text-muted">
            Vector Clock — como ler
          </h2>
          <p className="text-xs leading-relaxed text-muted">
            <code className="text-white">[a,b,c]</code> = quantos eventos de P0, P1 e P2,
            respectivamente, aquela réplica já conhece. Uma mensagem do autor <code>k</code> só é
            causalmente entregável quando <code className="text-white">VCₘ[k] = VC[k]+1</code> e{' '}
            <code className="text-white">VCₘ[i] ≤ VC[i]</code> para todo <code>i ≠ k</code> — caso
            contrário, falta uma dependência e a mensagem espera no buffer.
          </p>
        </section>

        <footer className="mt-8 text-center text-xs text-muted">
          Simulação fiel à lógica do projeto (Vector Clocks + buffer) · roda 100% no navegador ·{' '}
          <a
            href="https://github.com/LeonardoPCavalcanti"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-p0 hover:underline"
          >
            Leonardo Cavalcanti
          </a>
        </footer>
      </main>
    </div>
  );
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-600 transition-colors ${active ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
    >
      {label}
    </button>
  );
}

function ReplicaPanel({ idx, replica, mode }: { idx: number; replica: ReplicaState; mode: Mode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 font-700 ${REPLICA_COLOR[idx].split(' ')[0]}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${REPLICA_DOT[idx]}`} />
          {REPLICAS[idx]}
        </span>
        <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-xs text-white/80">
          VC [{replica.vc.join(',')}]
        </span>
      </div>

      {/* Feed */}
      <div className="mt-3 space-y-2">
        {replica.feed.length === 0 && <p className="py-4 text-center text-xs text-muted">— vazio —</p>}
        {replica.feed.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-2.5 text-sm ${
              item.orphan ? 'border-p2/50 bg-p2/10' : 'border-line bg-ink'
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[0.62rem] uppercase tracking-wide text-muted">
              {item.kind === 'post' ? (
                <MessageSquare size={11} />
              ) : (
                <CornerDownRight size={11} />
              )}
              {item.kind === 'post' ? 'post' : `resposta a ${item.parentId}`}
              {item.orphan && (
                <span className="ml-auto flex items-center gap-1 font-600 text-p2">
                  <AlertTriangle size={11} /> órfã
                </span>
              )}
            </div>
            <p className="text-white/90">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Buffer (CC) */}
      {mode === 'CC' && (
        <div className="mt-3 rounded-lg border border-dashed border-amber/40 bg-amber/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-wide text-amber">
            <PauseCircle size={12} /> Buffer ({replica.buffer.length})
          </div>
          {replica.buffer.length === 0 ? (
            <p className="mt-1 text-xs text-muted">vazio</p>
          ) : (
            replica.buffer.map((m) => (
              <p key={m.id} className="mt-1 font-mono text-xs text-amber/90">
                {m.id} aguardando VC[{m.vc.join(',')}]
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
