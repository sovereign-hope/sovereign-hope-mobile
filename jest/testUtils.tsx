import React from "react";
import { render as rtlRender, RenderAPI } from "@testing-library/react-native";
import { Provider as StoreProvider } from "react-redux";
import { store } from "src/app/store";

function render(
  ui: React.ReactElement<any, string | React.JSXElementConstructor<any>>,
  { locale = "en", ...renderOptions } = {}
): RenderAPI {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <StoreProvider store={store}>{children}</StoreProvider>;
  }
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// re-export everything
export * from "@testing-library/react-native";

// override render method
export { render };
