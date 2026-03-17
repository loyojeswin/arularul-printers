import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import orderRoutes from "./modules/orders/orders.routes";
import productRoutes from "./modules/products/products.routes";
import adminRoutes from "./modules/admin/admin.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import offerRoutes from "./modules/offers/offers.routes";
import addressRoutes from "./modules/addresses/addresses.routes";
import meRoutes from "./modules/me/me.routes";
import { errorHandler } from "./middleware/error-handler";

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/me", meRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

app.use(errorHandler);
