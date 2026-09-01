import { describe, expect, it } from "vitest";
import { renderBlogMarkdown, safeMarkdownHref } from "@/lib/blog-markdown";

describe("renderBlogMarkdown", () => {
  it("renders headings, lists, links and bold", () => {
    const html = renderBlogMarkdown(`## Başlık

Paragraf **kalın** ve [bağlantı](/otomatik-ders-programi).

- madde bir
- madde iki
`);

    expect(html).toContain("<h2>Başlık</h2>");
    expect(html).toContain("<strong>kalın</strong>");
    expect(html).toContain('<a href="/otomatik-ders-programi">bağlantı</a>');
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>madde bir</li>");
  });

  it("adds noopener on external links", () => {
    const html = renderBlogMarkdown(
      "[Derso](https://dersomatik.com/login)"
    );
    expect(html).toContain('href="https://dersomatik.com/login"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not emit HTML from quoted or javascript URLs", () => {
    const html = renderBlogMarkdown(
      `[x](https://evil.example/"onclick="alert(1)) [y](javascript:alert(1)) [z](//evil.example)`
    );
    expect(html).not.toContain("onclick=");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="//');
  });
});

describe("safeMarkdownHref", () => {
  it("accepts same-origin paths and http(s)", () => {
    expect(safeMarkdownHref("/blog")).toBe("/blog");
    expect(safeMarkdownHref("https://dersomatik.com")).toBe(
      "https://dersomatik.com/"
    );
  });

  it("rejects protocol-relative and script URLs", () => {
    expect(safeMarkdownHref("//evil.example")).toBeNull();
    expect(safeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(safeMarkdownHref('https://x.com/"onclick="alert(1)')).toBeNull();
  });
});
