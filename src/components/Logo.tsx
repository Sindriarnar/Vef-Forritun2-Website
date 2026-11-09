/** The site's mark: the name is a question, so the logo is a question mark. */
export function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      ?
    </span>
  );
}

export function Logo() {
  return (
    <>
      <LogoMark />
      <span className="logo-word">
        hvað á að gera<span className="logo-q">?</span>
      </span>
    </>
  );
}
