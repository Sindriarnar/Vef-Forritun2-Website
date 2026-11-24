import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Innskráning · Hvað á að gera?" };

export default function LoginPage() {
  return (
    <div className="page-shell secondary-page">
      <div className="page-head">
        <h1>Innskráning</h1>
        <p>Skráðu þig inn með einnota kóða sem þú færð í tölvupósti.</p>
      </div>
      <LoginForm />
    </div>
  );
}
