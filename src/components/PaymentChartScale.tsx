"use client";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
export interface PaymentScales {
  amount: number;
  count: number;
}
const Context = createContext<{
  scales: PaymentScales | null;
  setScales: Dispatch<SetStateAction<PaymentScales | null>>;
} | null>(null);
export function PaymentChartScaleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [scales, setScales] = useState<PaymentScales | null>(null);
  return (
    <Context.Provider value={{ scales, setScales }}>
      {children}
    </Context.Provider>
  );
}
export function usePaymentChartScale() {
  return useContext(Context);
}
export function paymentScaleMaximum(value: number) {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}
