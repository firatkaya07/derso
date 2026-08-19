import { describe, expect, it } from "vitest";
import { renderBlogMarkdown } from "@/lib/blog-markdown";

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
});
