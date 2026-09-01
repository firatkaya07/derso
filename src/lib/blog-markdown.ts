/**
 * Markdown → HTML for blog posts (headings, paragraphs, lists, links, bold).
 * Content is authored/seeded by us; still escape so a compromised post cannot XSS.
 */

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Yalnızca aynı-kaynak path veya http(s). Protocol-relative ve javascript: yok. */
export function safeMarkdownHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.includes("\\") || /[\s<>"'`]/.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.startsWith("/\\") || trimmed.toLowerCase().startsWith("/javascript:")) {
      return null;
    }
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

function renderInline(text: string): string {
  const escaped = escapeText(text);
  const withLinks = escaped.replace(
    /\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)/g,
    (_full, label: string, href: string) => {
      const safe = safeMarkdownHref(href.replace(/&amp;/g, "&"));
      if (!safe) return label;
      const isExternal = safe.startsWith("http");
      const extra = isExternal
        ? ' rel="noopener noreferrer" target="_blank"'
        : "";
      return `<a href="${escapeAttr(safe)}"${extra}>${label}</a>`;
    }
  );
  return withLinks.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

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
      html.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      i += 1;
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      i += 1;
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${renderInline(trimmed.replace(/^\d+\. /, ""))}</li>`);
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
    html.push(`<p>${renderInline(para.join(" "))}</p>`);
  }

  closeList();
  return html.join("\n");
}
