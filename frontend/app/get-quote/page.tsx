import { PriceCalculator } from "@/components/price-calculator";
import { OrderWorkbench } from "@/components/order-workbench";

export default function GetQuotePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-bold">Get Quote</h1>
        <p className="mt-2 text-slate-700">
          Estimate pricing and directly place your order with artwork upload.
        </p>
      </div>
      <div className="lg:col-span-1">
        <PriceCalculator />
      </div>
      <div className="lg:col-span-2">
        <OrderWorkbench />
      </div>
    </section>
  );
}
