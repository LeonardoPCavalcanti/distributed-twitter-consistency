// ─────────────────────────────────────────────────────────────────────────
// Motor de simulação de consistência em micro-blogging distribuído.
//
// 3 réplicas (P0, P1, P2), cada uma com um Relógio Vetorial (Vector Clock).
// Um cenário é uma sequência de passos: eventos criados localmente (origin) e
// chegadas de mensagens em outras réplicas (arrive). A entrega segue o modo:
//
//   • EC (Eventual Consistency): entrega na ordem de chegada. Uma reply pode
//     ser entregue ANTES do post pai → aparece como "reply órfã".
//   • CC (Causal Consistency): usa o Vector Clock para checar dependências
//     causais (broadcast causal). Se faltam dependências, a mensagem é
//     BUFFERIZADA e só entregue quando o pai chegar — nunca há reply órfã.
//
// Esta é a mesma lógica do projeto Python (Vector Clocks + buffer); aqui ela é
// reexecutada passo a passo para fins didáticos.
// ─────────────────────────────────────────────────────────────────────────

export type Mode = 'EC' | 'CC';
export const REPLICAS = ['P0', 'P1', 'P2'] as const;

export interface EventMsg {
  id: string;
  kind: 'post' | 'reply';
  authorIdx: number; // 0,1,2
  text: string;
  parentId?: string;
  vc: number[]; // relógio vetorial carregado pela mensagem
}

export interface FeedItem extends EventMsg {
  orphan?: boolean; // reply entregue sem o pai presente (só em EC)
}

export interface ReplicaState {
  vc: number[];
  feed: FeedItem[];
  buffer: EventMsg[]; // mensagens retidas aguardando dependências (CC)
}

export interface SimState {
  replicas: ReplicaState[];
  log: string[]; // narração do que aconteceu até aqui
}

type Step =
  | { type: 'origin'; at: number; id: string; kind: 'post' | 'reply'; text: string; parentId?: string }
  | { type: 'arrive'; at: number; id: string; fast?: boolean };

// Cenário clássico: a reply de P1 chega rápido em P2, mas o post pai (de P0)
// chega devagar — provocando a reordenação que diferencia EC de CC.
export const SCENARIO: Step[] = [
  { type: 'origin', at: 0, id: 'p1', kind: 'post', text: 'Alguém viu o jogo ontem? 👀' },
  { type: 'arrive', at: 1, id: 'p1' },
  { type: 'origin', at: 1, id: 'r1', kind: 'reply', parentId: 'p1', text: 'Que jogo?? 😅' },
  { type: 'arrive', at: 2, id: 'r1', fast: true },
  { type: 'arrive', at: 2, id: 'p1', fast: false },
  { type: 'arrive', at: 0, id: 'r1' },
];

export const STEP_COUNT = SCENARIO.length;

function emptyReplica(): ReplicaState {
  return { vc: [0, 0, 0], feed: [], buffer: [] };
}

/** Condição de entrega causal: a mensagem `m` (do autor k) só pode ser
 *  entregue na réplica com relógio `vc` se k avançou exatamente 1 e todas as
 *  outras dependências já foram vistas. */
function canDeliver(vc: number[], m: EventMsg): boolean {
  const k = m.authorIdx;
  if (m.vc[k] !== vc[k] + 1) return false;
  for (let i = 0; i < vc.length; i++) {
    if (i !== k && m.vc[i] > vc[i]) return false;
  }
  return true;
}

/** Reexecuta o cenário do zero até `upto` passos no modo dado. */
export function simulate(mode: Mode, upto: number): SimState {
  const replicas = [emptyReplica(), emptyReplica(), emptyReplica()];
  const registry = new Map<string, EventMsg>();
  const log: string[] = [];

  const deliver = (r: ReplicaState, m: EventMsg) => {
    const item: FeedItem = { ...m };
    if (m.kind === 'reply' && !r.feed.some((f) => f.id === m.parentId)) item.orphan = true;
    r.feed.push(item);
    for (let i = 0; i < r.vc.length; i++) r.vc[i] = Math.max(r.vc[i], m.vc[i]);
    return item;
  };

  for (let s = 0; s <= upto && s < SCENARIO.length; s++) {
    const step = SCENARIO[s];
    const r = replicas[step.at];

    if (step.type === 'origin') {
      r.vc[step.at] += 1;
      const ev: EventMsg = {
        id: step.id,
        kind: step.kind,
        authorIdx: step.at,
        text: step.text,
        parentId: step.parentId,
        vc: [...r.vc],
      };
      registry.set(step.id, ev);
      r.feed.push({ ...ev });
      log.push(
        `${REPLICAS[step.at]} cria ${step.kind === 'post' ? 'post' : 'reply'} "${step.text}" · VC=${fmt(r.vc)}`,
      );
      continue;
    }

    // arrive
    const ev = registry.get(step.id)!;
    const speed = step.fast ? ' (rápido)' : step.fast === false ? ' (lento)' : '';
    if (mode === 'EC') {
      const item = deliver(r, ev);
      log.push(
        `${REPLICAS[step.at]} recebe ${ev.id}${speed} → entrega imediata${item.orphan ? ' ⚠️ REPLY ÓRFÃ (pai ausente)' : ''}`,
      );
    } else {
      if (canDeliver(r.vc, ev)) {
        deliver(r, ev);
        log.push(`${REPLICAS[step.at]} recebe ${ev.id}${speed} → entrega (dependências OK) · VC=${fmt(r.vc)}`);
        // tenta liberar o buffer em cascata
        let progressed = true;
        while (progressed) {
          progressed = false;
          for (let i = 0; i < r.buffer.length; i++) {
            if (canDeliver(r.vc, r.buffer[i])) {
              const m = r.buffer.splice(i, 1)[0];
              deliver(r, m);
              log.push(`${REPLICAS[step.at]} libera ${m.id} do buffer → dependências satisfeitas · VC=${fmt(r.vc)}`);
              progressed = true;
              break;
            }
          }
        }
      } else {
        r.buffer.push(ev);
        log.push(`${REPLICAS[step.at]} recebe ${ev.id}${speed} → ⏸ BUFFERIZA (aguarda o pai chegar)`);
      }
    }
  }

  return { replicas, log };
}

function fmt(vc: number[]): string {
  return `[${vc.join(',')}]`;
}
