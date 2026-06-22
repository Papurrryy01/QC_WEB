export default function ThemeInitScript() {
  const script = `(() => {
    try {
      document.documentElement.setAttribute("data-theme", "light");
      window.localStorage.setItem("qc.theme", "light");
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
