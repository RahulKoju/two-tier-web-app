import sanitizeHtml from "sanitize-html";

const DESCRIPTION_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
] as const;

const DESCRIPTION_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
};

const EMPTY_DESCRIPTION_REGEX = /\s|&nbsp;|&#160;/g;

export function normalizeLinkHref(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return trimmed;
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeDescriptionHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [...DESCRIPTION_ALLOWED_TAGS],
    allowedAttributes: DESCRIPTION_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          href: attribs.href ? normalizeLinkHref(attribs.href) : attribs.href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
  }).trim();
}

export function getDescriptionTextContent(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replaceAll("\u00A0", " ")
    .trim();
}

export function normalizeDescriptionInput(value: string) {
  const textContent = getDescriptionTextContent(value);

  if (textContent.length === 0) {
    return undefined;
  }

  return sanitizeDescriptionHtml(value);
}

function legacyPlainTextToHtml(value: string) {
  const escaped = escapeHtml(value.trim());
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replaceAll("\n", "<br />"))
    .filter(Boolean);

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
}

export function getTaskDescriptionHtml(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const normalized =
    trimmed.startsWith("<") ? sanitizeDescriptionHtml(trimmed) : legacyPlainTextToHtml(trimmed);

  const textContent = getDescriptionTextContent(normalized);

  if (textContent.length === 0 || normalized.replace(EMPTY_DESCRIPTION_REGEX, "").length === 0) {
    return null;
  }

  return normalized;
}
