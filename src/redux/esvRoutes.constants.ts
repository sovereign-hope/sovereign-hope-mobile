const baseUrl = "https://api.esv.org/v3/passage";

export const routes = {
  passageText: (passage: string, includeFootnotes: boolean): string =>
    `${baseUrl}/html/?q=${passage}&include-footnotes=${
      includeFootnotes ? "true" : "false"
    }`,
};
