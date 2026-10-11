import { $ } from "../../lib/dom.js";

/* Listeyi yenilemek için arama (sayfayı kaydırmaz) */
export function sessizAra() { window._aramaSessiz = true; try { $("aramaButonu").click(); } finally { window._aramaSessiz = false; } }
