"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { signOut } from "@/app/(auth)/login/actions";
import { BackupButton } from "@/app/(app)/profile/backup-button";
import {
  changePassword,
  deleteAccount,
  saveAccount,
  saveCitationStyle,
  saveProjectDefaults,
  signOutOthers,
} from "@/app/(app)/profile/actions";
import { initialsOf } from "@/lib/citation";
import { BUILTIN_FIELDS } from "@/lib/fields";
import type { CitationStyleChoice, ProjectDefaults } from "@/lib/project-defaults";
import { AdminAiSection } from "./admin-ai";
import { AdminUsersSection } from "./admin-users";
import { FontSample, FontSelect } from "./font-controls";
import {
  ChartIcon,
  CloseIcon,
  DatabaseIcon,
  GearIcon,
  SlidersIcon,
  SparkIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { DefaultLanguage } from "./language-select";
import { ThemeChoice } from "./theme-controls";
import { UsageSection } from "./usage-section";
import { VerificationControls } from "./verification-controls";

export type SettingsProfile = {
  email: string | null;
  fullName: string | null;
  institution: string | null;
  defaultLanguage: string;
  citationStyle: CitationStyleChoice;
  projectDefaults: ProjectDefaults;
  isAdmin: boolean;
};

type Section = "geral" | "projetos" | "conta" | "uso" | "dados" | "ia" | "usuarios";

const SECTIONS: { id: Section; label: string; icon: ReactNode; admin?: boolean }[] = [
  { id: "geral", label: "Geral", icon: <GearIcon /> },
  { id: "projetos", label: "Projetos", icon: <SlidersIcon /> },
  { id: "conta", label: "Conta", icon: <UserIcon /> },
  { id: "uso", label: "Uso", icon: <ChartIcon /> },
  { id: "dados", label: "Dados", icon: <DatabaseIcon /> },
  { id: "ia", label: "IA", icon: <SparkIcon />, admin: true },
  { id: "usuarios", label: "Usuários", icon: <UsersIcon />, admin: true },
];

const CITATION_LABELS: Record<CitationStyleChoice, string> = {
  abnt: "ABNT (NBR 6023)",
  apa: "APA 7",
  vancouver: "Vancouver",
  bibtex: "BibTeX",
};

function CitationStyleSelect({ initial }: { initial: CitationStyleChoice }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        id="fx-citacao"
        value={value}
        disabled={pending}
        className="field min-w-[220px] cursor-pointer"
        onChange={(e) => {
          const v = e.target.value as CitationStyleChoice;
          setValue(v);
          start(async () => {
            const r = await saveCitationStyle(v);
            setMsg(r.ok ? "Salvo." : "Não foi possível salvar.");
            // A ficha e a exportação abertas atrás da modal passam a usar a norma.
            if (r.ok) router.refresh();
          });
        }}
      >
        {(Object.keys(CITATION_LABELS) as CitationStyleChoice[]).map((k) => (
          <option key={k} value={k}>
            {CITATION_LABELS[k]}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="text-xs text-muted">
        {pending ? "Salvando…" : msg}
      </span>
    </div>
  );
}

function ProjectsSection({ profile }: { profile: SettingsProfile }) {
  const [v, setV] = useState(profile.projectDefaults);
  const [saved, setSaved] = useState(profile.projectDefaults);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  return (
    <>
      <Heading>Padrões dos projetos novos</Heading>
      <p className="m-0 mb-4 text-[13px] text-muted">
        Valem para os projetos que você criar daqui em diante. Cada projeto pode mudar os seus, na visão do projeto.
      </p>
      <VerificationControls value={v} onChange={setV} fields={BUILTIN_FIELDS.map((f) => ({ ...f }))} disabled={pending} />
      <div className="flex items-center justify-end gap-3 pt-5">
        <span aria-live="polite" className="text-[13px] text-muted">
          {pending ? "Salvando…" : dirty ? "" : msg}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              const r = await saveProjectDefaults(v);
              setMsg(r.ok ? "Salvo." : "Não foi possível salvar.");
              if (r.ok) setSaved(v);
            })
          }
        >
          Salvar
        </button>
      </div>
    </>
  );
}

/** Linha de configuração: nome e descrição à esquerda, controle à direita. */
function Row({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[15px]">
            {label}
          </label>
        ) : (
          <span className="text-[15px]">{label}</span>
        )}
        {hint && <div className="text-[13px] text-muted">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="m-0 mt-2 mb-1 text-lg font-semibold first:mt-0">{children}</h3>;
}

function GeneralSection({ profile }: { profile: SettingsProfile }) {
  const [fontMsg, setFontMsg] = useState("");
  return (
    <>
      <Heading>Aparência</Heading>
      <Row label="Tema">
        <ThemeChoice />
      </Row>
      <Row label="Fonte da interface" htmlFor="fx-font-ui" hint={<FontSample role="ui" />}>
        <FontSelect role="ui" id="fx-font-ui" onSaved={(ok) => setFontMsg(ok ? "" : "Aplicada só neste navegador.")} />
      </Row>
      <Row
        label="Fonte dos artigos"
        htmlFor="fx-font-article"
        hint={
          <>
            <FontSample role="article" />
            <span>Título, resumo, campos da ficha, trechos, referências, notas e matriz.</span>
          </>
        }
      >
        <FontSelect role="article" id="fx-font-article" onSaved={(ok) => setFontMsg(ok ? "" : "Aplicada só neste navegador.")} />
      </Row>
      {fontMsg && <p className="m-0 text-xs text-warn">{fontMsg}</p>}

      <Heading>Fichas</Heading>
      <Row
        label="Idioma das fichas"
        htmlFor="fx-idioma-padrao"
        hint="Padrão dos projetos novos. Cada projeto pode ter o seu, na visão do projeto."
      >
        <DefaultLanguage initial={profile.defaultLanguage} />
      </Row>
      <Row
        label="Norma de referência"
        htmlFor="fx-citacao"
        hint="Abre primeiro na ficha e define a lista de referências exportada."
      >
        <CitationStyleSelect initial={profile.citationStyle} />
      </Row>
    </>
  );
}

function AccountSection({ profile }: { profile: SettingsProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.fullName ?? "");
  const [inst, setInst] = useState(profile.institution ?? "");
  const [saved, setSaved] = useState({ name: profile.fullName ?? "", inst: profile.institution ?? "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const dirty = name.trim() !== saved.name.trim() || inst.trim() !== saved.inst.trim();

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pwPending, pwStart] = useTransition();

  return (
    <>
      <Heading>Perfil</Heading>
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!dirty) return;
          start(async () => {
            const { ok } = await saveAccount(name, inst);
            setMsg(ok ? "Salvo." : "Não foi possível salvar.");
            if (ok) {
              setSaved({ name, inst });
              // Só o que mostra o nome (iniciais na barra lateral) precisa recarregar.
              router.refresh();
            }
          });
        }}
      >
        <Row label="Nome" htmlFor="fx-cfg-nome">
          <input
            id="fx-cfg-nome"
            className="field w-full min-[640px]:w-[280px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={200}
          />
        </Row>
        <Row label="Instituição" htmlFor="fx-cfg-inst">
          <input
            id="fx-cfg-inst"
            className="field w-full min-[640px]:w-[280px]"
            value={inst}
            onChange={(e) => setInst(e.target.value)}
            autoComplete="organization"
            maxLength={200}
          />
        </Row>
        <Row label="E-mail" hint="Usado para entrar. Não pode ser trocado por aqui.">
          <span className="text-[15px] text-muted">{profile.email}</span>
        </Row>
        <div className="flex items-center justify-end gap-3 pt-3">
          <span aria-live="polite" className="text-[13px] text-muted">
            {pending ? "Salvando…" : dirty ? "" : msg}
          </span>
          <button type="submit" className="btn btn-primary" disabled={!dirty || pending}>
            Salvar
          </button>
        </div>
      </form>

      <Heading>Senha</Heading>
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          pwStart(async () => {
            const r = await changePassword(pw.current, pw.next, pw.confirm);
            setPwMsg(r.ok ? { ok: true, text: "Senha trocada." } : { text: r.error ?? "Não foi possível trocar a senha." });
            if (r.ok) setPw({ current: "", next: "", confirm: "" });
          });
        }}
      >
        {/* Campo oculto ajuda o gerenciador de senhas a associar a conta. */}
        <input type="email" name="username" autoComplete="username" value={profile.email ?? ""} readOnly hidden />
        <Row label="Senha atual" htmlFor="fx-pw-atual">
          <input
            id="fx-pw-atual"
            type="password"
            className="field w-full min-[640px]:w-[280px]"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            autoComplete="current-password"
            required
          />
        </Row>
        <Row label="Nova senha" htmlFor="fx-pw-nova" hint="Ao menos 8 caracteres.">
          <input
            id="fx-pw-nova"
            type="password"
            className="field w-full min-[640px]:w-[280px]"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </Row>
        <Row label="Confirmar nova senha" htmlFor="fx-pw-conf">
          <input
            id="fx-pw-conf"
            type="password"
            className="field w-full min-[640px]:w-[280px]"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </Row>
        <div className="flex items-center justify-end gap-3 pt-3">
          <span aria-live="polite" className={`text-[13px] ${pwMsg?.ok ? "text-accent" : "text-warn"}`}>
            {pwPending ? "" : pwMsg?.text}
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pwPending || !pw.current || !pw.next || !pw.confirm}
          >
            {pwPending ? "Trocando…" : "Trocar senha"}
          </button>
        </div>
      </form>

      <Heading>Sessão</Heading>
      <Row label="Sair da conta" hint="Encerra a sessão neste navegador.">
        <form action={signOut}>
          <button className="btn" type="submit">
            Sair
          </button>
        </form>
      </Row>
      <SignOutOthers />

      <Heading>Excluir conta</Heading>
      <DeleteAccount profile={profile} />
    </>
  );
}

function SignOutOthers() {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Row
      label="Sair dos outros aparelhos"
      hint={msg || "Encerra as sessões abertas em outros navegadores e aparelhos. Esta continua."}
    >
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await signOutOthers();
            setMsg(r.ok ? "Pronto: as outras sessões foram encerradas." : "Não foi possível encerrar as outras sessões.");
          })
        }
      >
        {pending ? "Encerrando…" : "Sair dos outros"}
      </button>
    </Row>
  );
}

function DeleteAccount({ profile }: { profile: SettingsProfile }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (profile.isAdmin) {
    return (
      <p className="m-0 text-[13px] text-muted">
        Contas de administrador não podem ser excluídas por aqui. Tire o papel de admin antes, no Supabase.
      </p>
    );
  }
  if (!open) {
    return (
      <Row label="Excluir minha conta" hint="Apaga projetos, artigos, fichas, notas e PDFs. Não dá para desfazer.">
        <button type="button" className="btn border-warn text-warn" onClick={() => setOpen(true)}>
          Excluir conta…
        </button>
      </Row>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-warn p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await deleteAccount(password, confirm);
          if (r?.error) setError(r.error);
        });
      }}
    >
      <p className="m-0 text-[13px]">
        Tudo será apagado: projetos, artigos, fichas, notas e PDFs. Faça um backup antes (seção Dados). Não dá para
        desfazer.
      </p>
      <input type="email" name="username" autoComplete="username" value={profile.email ?? ""} readOnly hidden />
      <label className="flex flex-col gap-1 text-[13px]">
        Senha
        <input
          type="password"
          className="field"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[13px]">
        Digite EXCLUIR para confirmar
        <input className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" required />
      </label>
      <div className="flex items-center justify-end gap-3">
        <span aria-live="polite" className="text-[13px] text-warn">
          {pending ? "" : error}
        </span>
        <button type="button" className="text-[13px] text-muted underline" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn border-warn text-warn"
          disabled={pending || !password || confirm.trim().toUpperCase() !== "EXCLUIR"}
        >
          {pending ? "Excluindo…" : "Excluir conta para sempre"}
        </button>
      </div>
    </form>
  );
}

function DataSection() {
  return (
    <>
      <Heading>Backup</Heading>
      <p className="m-0 mb-4 text-[13px] text-muted">
        Arquivo JSON com seus projetos, artigos, fichas, trechos, revisões e notas.
      </p>
      <BackupButton />
    </>
  );
}

/**
 * Configurações em modal (estilo Claude Desktop): menu à esquerda, seção à
 * direita. Aparência vale na hora; conta só salva (e recarrega) se mudou.
 * Abre pelo botão do perfil ou por ?config=<seção>. Seções de admin só aparecem para admin.
 */
export function SettingsButton({ profile }: { profile: SettingsProfile }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  // Link direto (ex.: /projects?config=conta) abre a modal naquela seção.
  const fromUrl = params.get("config");
  const sections = SECTIONS.filter((s) => !s.admin || profile.isAdmin);
  const urlSection = sections.find((s) => s.id === fromUrl)?.id;
  const [chosen, setChosen] = useState<Section | null>(null);
  const section: Section = chosen ?? urlSection ?? "geral";
  const setSection = setChosen;

  const open = useCallback(() => {
    setChosen("geral");
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (fromUrl && !dialog.current?.open) dialog.current?.showModal();
  }, [fromUrl]);

  /** Ao fechar: tira o ?config da URL (para não reabrir ao recarregar). */
  const onClose = () => {
    setChosen(null);
    if (!fromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("config");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => open()}
        className="flex min-h-11 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-sunk"
        aria-haspopup="dialog"
      >
        <span className="inline-flex size-7 flex-none items-center justify-center rounded-full bg-sunk text-[11px] font-semibold">
          {initialsOf(profile.fullName, profile.email)}
        </span>
        <span className="min-w-0 truncate">{profile.fullName?.split(" ")[0] ?? "Perfil"}</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="fx-cfg-title"
        onClose={onClose}
        // Clique fora (no fundo) fecha.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto h-[min(760px,92dvh)] w-[min(1000px,96vw)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 max-[640px]:h-dvh max-[640px]:w-screen max-[640px]:max-w-none max-[640px]:rounded-none"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 id="fx-cfg-title" className="m-0 text-lg font-semibold">
              Configurações
            </h2>
            <button type="button" className="icon-btn -mr-2" aria-label="Fechar" onClick={() => dialog.current?.close()}>
              <CloseIcon />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 max-[640px]:flex-col">
            <nav
              aria-label="Seções"
              className="flex w-[220px] flex-none flex-col gap-1 border-r border-line p-3 max-[640px]:w-full max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:border-r-0 max-[640px]:border-b"
            >
              {sections.map((s, i) => (
                <div key={s.id} className="contents">
                {s.admin && !sections[i - 1]?.admin && (
                  <span className="eyebrow mt-4 px-3 pb-1 max-[640px]:hidden">Administração</span>
                )}
                <button
                  type="button"
                  aria-current={section === s.id ? "page" : undefined}
                  onClick={() => setSection(s.id)}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-[15px] whitespace-nowrap ${
                    section === s.id ? "bg-sunk font-medium" : "text-muted hover:bg-sunk/60 hover:text-ink"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
                </div>
              ))}
            </nav>
            <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
              {section === "geral" && <GeneralSection profile={profile} />}
              {section === "conta" && <AccountSection profile={profile} />}
              {section === "projetos" && <ProjectsSection profile={profile} />}
              {section === "uso" && <UsageSection />}
              {section === "dados" && <DataSection />}
              {section === "ia" && profile.isAdmin && <AdminAiSection />}
              {section === "usuarios" && profile.isAdmin && <AdminUsersSection />}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
