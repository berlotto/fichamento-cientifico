/** Ícones de traço do design (decorativos: o rótulo fica no botão). */
type P = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const SunIcon = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" />
  </svg>
);

export const PlusIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.7} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const LinkIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.7} {...base}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </svg>
);

export const CheckIcon = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}>
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
);

export const BackIcon =({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const SearchIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const DownloadIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.7} {...base}>
    <path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14" />
  </svg>
);

export const FileIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);
