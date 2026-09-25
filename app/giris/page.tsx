import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import { PinForm } from "./PinForm";

export const metadata = { title: "Giriş · Stokta" };

export default async function LoginPage() {
  if (await hasSession()) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <PinForm />
    </main>
  );
}
