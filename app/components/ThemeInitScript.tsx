export default function ThemeInitScript() {
  const script = `(() => {
    try {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const applyTheme = () => {
        document.documentElement.setAttribute("data-theme", media.matches ? "dark" : "light");
      };
      applyTheme();
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", applyTheme);
      } else if (typeof media.addListener === "function") {
        media.addListener(applyTheme);
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
