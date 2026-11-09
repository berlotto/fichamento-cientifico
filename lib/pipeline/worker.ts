/**
 * Laço do worker: lê mensagens da fila, executa UM estágio por mensagem,
 * arquiva em caso de sucesso e marca o artigo como `failed` depois de
 * MAX_ATTEMPTS tentativas (ajuste A3).
 *
 * Sem dependência de Supabase aqui: a fila e os efeitos entram por parâmetro,
 * para poder testar.
 */

export const STAGES = ["parse", "extract", "crosscheck"] as const;
export type Stage = (typeof STAGES)[number];

export type PipelineMessage = { article_id: string; stage: Stage };

export type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: unknown;
};

export interface Queue {
  read(qty: number, vtSeconds: number): Promise<QueueMessage[]>;
  send(msg: PipelineMessage, delaySeconds?: number): Promise<void>;
  archive(msgId: number): Promise<void>;
}

export type StageHandler = (msg: PipelineMessage) => Promise<void>;

export interface WorkerDeps {
  queue: Queue;
  handlers: Record<Stage, StageHandler>;
  markFailed(articleId: string, error: string): Promise<void>;
  recordError(articleId: string, error: string): Promise<void>;
  now?: () => number;
  log?: (msg: string) => void;
}

/** Erro em que repetir não adianta: o worker marca o artigo como failed na hora. */
export class PermanentError extends Error {}

export const MAX_ATTEMPTS = 3;
/** Visibility timeout: maior que o maxDuration da função (300 s). */
export const VT_SECONDS = 360;
export const BATCH = 3;

export type WorkerResult = { processed: number; failed: number; retried: number; skipped: number };

export function parseMessage(raw: unknown): PipelineMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const { article_id, stage } = raw as Record<string, unknown>;
  if (typeof article_id !== "string" || !/^[0-9a-f-]{36}$/i.test(article_id)) return null;
  if (!STAGES.includes(stage as Stage)) return null;
  return { article_id, stage: stage as Stage };
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 2000);

export async function runWorker(deps: WorkerDeps, budgetMs: number): Promise<WorkerResult> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const deadline = now() + budgetMs;
  const result: WorkerResult = { processed: 0, failed: 0, retried: 0, skipped: 0 };

  while (now() < deadline) {
    const batch = await deps.queue.read(BATCH, VT_SECONDS);
    if (batch.length === 0) break;

    for (const m of batch) {
      // Sem tempo para mais um estágio (a extração leva minutos): a mensagem volta
      // para a fila quando o visibility timeout expirar.
      if (now() >= deadline) break;
      const msg = parseMessage(m.message);
      if (!msg) {
        log(`mensagem inválida ${m.msg_id}: arquivada`);
        await deps.queue.archive(m.msg_id);
        result.skipped++;
        continue;
      }

      // read_ct conta esta leitura: 1 na primeira tentativa.
      if (m.read_ct > MAX_ATTEMPTS) {
        await deps.markFailed(msg.article_id, `estágio ${msg.stage} falhou ${MAX_ATTEMPTS} vezes`);
        await deps.queue.archive(m.msg_id);
        result.failed++;
        continue;
      }

      try {
        await deps.handlers[msg.stage](msg);
        await deps.queue.archive(m.msg_id);
        result.processed++;
      } catch (e) {
        if (e instanceof PermanentError) {
          // Tentar de novo não resolve (PDF sumiu, sem texto): falha já.
          log(`falha permanente em ${msg.stage} ${msg.article_id}: ${errorText(e)}`);
          await deps.markFailed(msg.article_id, errorText(e));
          await deps.queue.archive(m.msg_id);
          result.failed++;
          continue;
        }
        // A mensagem fica invisível até o VT expirar e então é relida.
        log(`erro em ${msg.stage} ${msg.article_id} (tentativa ${m.read_ct}): ${errorText(e)}`);
        await deps.recordError(msg.article_id, `tentativa ${m.read_ct}: ${errorText(e)}`);
        result.retried++;
      }
    }
  }
  return result;
}
