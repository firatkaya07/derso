/**
 * Trusted markdown → HTML for blog posts (headings, paragraphs, lists, links, bold).
 * Content is authored/seeded by us; not for arbitrary user HTML.
 */
export function renderBlogMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const inline = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)/g,
        '<a href="$2">$1</a>'
      )
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
      i += 1;
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inline(trimmed.slice(2))}</li>`);
      i += 1;
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inline(trimmed.replace(/^\d+\. /, ""))}</li>`);
      i += 1;
      continue;
    }

    closeList();
    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (
        !next ||
        next.startsWith("## ") ||
        next.startsWith("### ") ||
        /^[-*] /.test(next) ||
        /^\d+\. /.test(next)
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }

  closeList();
  return html.join("\n");
}
