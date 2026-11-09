import {
  Architects_Daughter,
  Caveat,
  DM_Sans,
  Indie_Flower,
  Instrument_Sans,
  Inter,
  Kalam,
  Lora,
  Merriweather,
  Newsreader,
  Noto_Sans,
  Noto_Serif,
  Nunito,
  Patrick_Hand,
  Plus_Jakarta_Sans,
  Poppins,
  Roboto,
  Source_Sans_3,
  Source_Serif_4,
  Urbanist,
  Work_Sans,
} from "next/font/google";

/*
 * Fontes do app (next/font: servidas pelo próprio domínio, sem chamar o Google
 * no navegador). Só as duas padrão têm preload; as opcionais são baixadas pelo
 * navegador apenas quando escolhidas (@font-face só carrega quando usado).
 * As variáveis CSS precisam bater com lib/fonts.ts.
 */

// Padrão
export const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
export const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], axes: ["opsz"] });

// Opcionais
export const inter = Inter({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-inter" });
export const sourceSans = Source_Sans_3({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-source-sans" });
export const workSans = Work_Sans({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-work-sans" });
export const roboto = Roboto({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-roboto" });
export const notoSans = Noto_Sans({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-noto-sans" });
export const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-dm-sans" });
export const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-plus-jakarta" });
export const nunito = Nunito({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-nunito" });
export const poppins = Poppins({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-poppins", weight: ["400", "500", "600"] });
export const urbanist = Urbanist({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-urbanist" });
export const lora = Lora({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-lora" });
export const merriweather = Merriweather({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-merriweather" });
export const notoSerif = Noto_Serif({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-noto-serif" });
export const sourceSerif = Source_Serif_4({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-source-serif" });
export const patrickHand = Patrick_Hand({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-patrick-hand", weight: "400" });
export const kalam = Kalam({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-kalam", weight: ["400", "700"] });
export const caveat = Caveat({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-caveat" });
export const architectsDaughter = Architects_Daughter({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-architects-daughter", weight: "400" });
export const indieFlower = Indie_Flower({ subsets: ["latin", "latin-ext"], preload: false, display: "swap", variable: "--font-indie-flower", weight: "400" });

export const fontVariables = [
  instrumentSans,
  newsreader,
  inter,
  sourceSans,
  workSans,
  roboto,
  notoSans,
  dmSans,
  plusJakarta,
  nunito,
  poppins,
  urbanist,
  lora,
  merriweather,
  notoSerif,
  sourceSerif,
  patrickHand,
  kalam,
  caveat,
  architectsDaughter,
  indieFlower,
]
  .map((f) => f.variable)
  .join(" ");
