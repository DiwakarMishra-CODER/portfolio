import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HostLab from "./HostLab";
import "@/components/home/home.css";
import "@/components/host/host.css";

export const metadata: Metadata = { title: "Host lab", robots: { index: false } };

/** Dev only: look at the host from every side, try his moves, export the poster. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HostLab />;
}
