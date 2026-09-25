/**
 * React Email şablonlarını HTML + düz metin çiftine çevirir.
 * Her mail iki biçimde de gider: spam puanını düşürür ve metin
 * okuyucularda anlamlı kalır.
 */
import { render, toPlainText } from "@react-email/components";
import type { ReactElement } from "react";

export interface RenderedMail {
  html: string;
  text: string;
}

/**
 * @param element   Şablon.
 * @param plainText Şablonun kendi düz metni.
 *
 * Türkçe şablonlarda `plainText` her zaman verilmeli: otomatik türetici
 * başlıkları büyütürken "i" harfini İngilizce kurallarıyla çevirip bozuyor
 * ("geldi" → "GELDI") ve bu geri döndürülemiyor. Parametre verilmezse
 * türetmeye düşülür — yalnızca başlıksız, tek dilli şablonlar için uygundur.
 */
export async function renderMail(
  element: ReactElement,
  plainText?: string,
): Promise<RenderedMail> {
  const html = await render(element, { pretty: false });
  return { html, text: plainText ?? toPlainText(html) };
}
