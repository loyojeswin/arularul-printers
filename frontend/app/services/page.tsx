const services = [
  "Corporate print management",
  "Bulk visiting cards",
  "Flyers and brochures",
  "Design file review",
  "Delivery tracking"
];

export default function ServicesPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Services</h1>
      <ul className="mt-4 space-y-2">
        {services.map((item) => (
          <li key={item} className="rounded bg-white p-3 shadow-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
