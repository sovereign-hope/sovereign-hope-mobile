import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { FlatButton } from "../FlatButton";

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider value={DefaultTheme}>{component}</ThemeProvider>);

describe("FlatButton", () => {
  it("should render", () => {
    const wrapper = renderWithTheme(
      <FlatButton title="test" onPress={() => {}} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("should render the title", () => {
    const titleText = "test";
    const wrapper = renderWithTheme(
      <FlatButton title={titleText} onPress={() => {}} />
    );
    const title = wrapper.getByText(titleText);
    expect(title).toBeTruthy();
  });

  it("should render an icon", () => {
    const wrapper = renderWithTheme(
      <FlatButton title="test" icon="mail" onPress={() => {}} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("should trigger the onPress action", () => {
    const mock = jest.fn();
    const wrapper = renderWithTheme(<FlatButton title="test" onPress={mock} />);
    fireEvent.press(wrapper.getByText("test"));
    expect(mock).toHaveBeenCalled();
  });
});
