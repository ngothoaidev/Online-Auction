import sanitizeHtml from "sanitize-html";

// Rich text produced by the Tiptap StarterKit editor; everything else (script, handlers, styles, other schemes) is dropped.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "hr", "strong", "b", "em", "i", "u", "s", "strike", "code", "pre", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "a"],
  allowedAttributes: { a: ["href", "title", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }, true) },
};

export const sanitizeRichText = (html: unknown): string => (typeof html === "string" ? sanitizeHtml(html, OPTIONS) : "");
