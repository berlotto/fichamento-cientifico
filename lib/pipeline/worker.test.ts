import { describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS, PermanentError, runWorker, type PipelineMessage, type Queue, type QueueMessage } from "./worker";

const ARTICLE = "11111111-2222-3333-4444-555555555555";

/** Fila em memória que imita o pgmq: read incrementa read_ct; VT expira na próxima leitura. */
function fakeQueue(initial: unknown[]) {
  let nextId = 1;
  const msgs: (QueueMessage & { archived: boolean })[] = initial.map((message) => ({
    msg_id: nextId++,
    read_ct: 0,
    message,
    archived: false,
  }));
  let reads = 0;
  const queue: Queue = {
    async read(qty) {
      reads++;
      // Uma leitura por "tick": após ler, o worker do teste para (simula o VT).
      if (reads > 1) return [];
      const out = msgs.filter((m) => !m.archived).slice(0, qty);
      out.forEach((m) => m.read_ct++);
      return out.map(({ msg_id, read_ct, message }) => ({ msg_id, read_ct, message }));
    },
    async send(message: PipelineMessage) {
      msgs.push({ msg_id: nextId++, read_ct: 0, message, archived: false });
    },
    async archive(id) {
      msgs.find((m) => m.msg_id === id)!.archived = true;
    },
  };
  return { queue, msgs, newTick: () => (reads = 0) };
}

function deps(
  queue: Queue,
  parse: (m: PipelineMessage) => Promise<void>,
  extract: (m: PipelineMessage) => Promise<void> = async () => {},
) {
  return {
    queue,
    handlers: { parse, extract },
    markFailed: vi.fn(async () => {}),
    recordError: vi.fn(async () => {}),
  };
}

describe("runWorker", () => {
  it("processa e arquiva", async () => {
    const q = fakeQueue([{ article_id: ARTICLE, stage: "parse" }]);
    const parse = vi.fn(async () => {});
    const r = await runWorker(deps(q.queue, parse), 10_000);
    expect(parse).toHaveBeenCalledOnce();
    expect(r.processed).toBe(1);
    expect(q.msgs[0].archived).toBe(true);
  });

  it("após MAX_ATTEMPTS falhas marca failed e arquiva", async () => {
    const q = fakeQueue([{ article_id: ARTICLE, stage: "parse" }]);
    const d = deps(q.queue, async () => {
      throw new Error("PDF corrompido");
    });

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      q.newTick();
      const r = await runWorker(d, 10_000);
      expect(r.retried).toBe(1);
    }
    expect(d.recordError).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(q.msgs[0].archived).toBe(false);

    q.newTick();
    const r = await runWorker(d, 10_000);
    expect(r.failed).toBe(1);
    expect(d.markFailed).toHaveBeenCalledWith(ARTICLE, expect.stringContaining("parse"));
    expect(q.msgs[0].archived).toBe(true);
  });

  it("arquiva mensagem inválida sem chamar handler", async () => {
    const q = fakeQueue([{ article_id: "x", stage: "parse" }, { stage: "nope" }]);
    const parse = vi.fn(async () => {});
    const r = await runWorker(deps(q.queue, parse), 10_000);
    expect(parse).not.toHaveBeenCalled();
    expect(r.skipped).toBe(2);
  });

  it("respeita o orçamento de tempo", async () => {
    const q = fakeQueue([{ article_id: ARTICLE, stage: "parse" }]);
    const parse = vi.fn(async () => {});
    const r = await runWorker({ ...deps(q.queue, parse), now: () => 0 }, 0);
    expect(parse).not.toHaveBeenCalled();
    expect(r.processed).toBe(0);
  });

  it("encaminha extract ao handler certo", async () => {
    const q = fakeQueue([{ article_id: ARTICLE, stage: "extract" }]);
    const parse = vi.fn(async () => {});
    const extract = vi.fn(async () => {});
    const r = await runWorker(deps(q.queue, parse, extract), 1000);
    expect(extract).toHaveBeenCalledWith({ article_id: ARTICLE, stage: "extract" });
    expect(parse).not.toHaveBeenCalled();
    expect(r.processed).toBe(1);
  });

  it("não começa estágio novo depois do prazo, mesmo no meio do lote", async () => {
    const q = fakeQueue([
      { article_id: ARTICLE, stage: "extract" },
      { article_id: ARTICLE, stage: "extract" },
    ]);
    let t = 0;
    const extract = vi.fn(async () => {
      t = 2000; // o primeiro estágio estoura o orçamento
    });
    const r = await runWorker({ ...deps(q.queue, vi.fn(), extract), now: () => t }, 1000);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(r.processed).toBe(1);
  });
});

describe("falha permanente", () => {
  it("marca failed na primeira tentativa e arquiva", async () => {
    const q = fakeQueue([{ article_id: ARTICLE, stage: "parse" }]);
    const d = deps(q.queue, async () => {
      throw new PermanentError("PDF não encontrado no armazenamento.");
    });
    const r = await runWorker(d, 1000);
    expect(r.failed).toBe(1);
    expect(d.markFailed).toHaveBeenCalledWith(ARTICLE, "PDF não encontrado no armazenamento.");
    expect(q.msgs[0].archived).toBe(true);
  });
});
