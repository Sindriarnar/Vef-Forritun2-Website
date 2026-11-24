import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Innskráning · Hvað á að gera?" };

// Bara útlitið: formið er ekki tengt neinni innskráningu enn (sjá LoginForm).
export default function LoginPage() {
  return (
    <div className="page-shell secondary-page">
      <div className="page-head">
        <h1>Innskráning</h1>
        <p>Skráðu þig inn með netfangi og lykilorði.</p>
      </div>
      <LoginForm />
    </div>
  );
}
