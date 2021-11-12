import { TypedUseSelectorHook, useSelector } from "react-redux";
import type { RootState } from "src/app/store";

// Should be used instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Should be used instead of plain `useDispatch` if middleware is added to redux
// export const useAppDispatch = () => useDispatch<AppDispatch>();
