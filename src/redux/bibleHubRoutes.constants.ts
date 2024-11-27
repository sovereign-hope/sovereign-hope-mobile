const baseUrl = "https://biblemenus.com/";

export const routes = {
  passageText: (passage: string): string =>
    `${baseUrl}searchell.php?q=${passage}`,
};
