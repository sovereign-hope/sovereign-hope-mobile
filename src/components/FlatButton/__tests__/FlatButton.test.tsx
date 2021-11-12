import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FlatButton } from "../FlatButton";

describe("FlatButton", () => {
  it("should render", () => {
    const wrapper = render(<FlatButton title="test" onPress={() => {}} />);
    expect(wrapper).toMatchSnapshot();
  });

  it("should render the title", () => {
    const titleText = "test";
    const wrapper = render(<FlatButton title={titleText} onPress={() => {}} />);
    const title = wrapper.getByText(titleText);
    expect(title).toBeTruthy();
  });

  it("should render an icon", () => {
    const wrapper = render(
      <FlatButton title="test" icon="mail" onPress={() => {}} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("should trigger the onPress action", () => {
    const mock = jest.fn();
    const wrapper = render(<FlatButton title="test" onPress={mock} />);
    fireEvent.press(wrapper.getByText("test"));
    expect(mock).toHaveBeenCalled();
  });
});
