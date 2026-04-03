const baseUrl = "https://api.esv.org/v3/passage";

export const routes = {
  passageText: (
    passage: string,
    includeFootnotes: boolean,
    includeVerseNumbers: boolean
  ): string =>
    `${baseUrl}/html/?q=${encodeURIComponent(passage)}&include-footnotes=${
      includeFootnotes ? "true" : "false"
    }&include-verse-numbers=${includeVerseNumbers ? "true" : "false"}`,
  passagePlainText: (passage: string): string =>
    `${baseUrl}/text/?q=${encodeURIComponent(
      passage
    )}&include-footnotes=false&include-verse-numbers=false&include-headings=false&include-short-copyright=false&include-passage-references=false`,
};
