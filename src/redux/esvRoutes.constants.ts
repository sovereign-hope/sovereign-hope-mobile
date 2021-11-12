const baseUrl = "https://api.esv.org/v3/passage";

export const routes = {
  passageText: (passage: string) => `${baseUrl}/text/?q=${passage}`,
};
