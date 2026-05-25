"use client";

import { useEffect, useMemo } from "react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // or "github.css" for light

// Configure marked once (plugin handles syntax highlight)
marked.use(
    markedHighlight({
        langPrefix: "hljs language-",
        highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        }
    })
);

// Optional: keep other marked options here (no 'highlight' key anymore)
marked.setOptions({
    gfm: true,
    breaks: true
});

function sanitizeHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/\son[a-z]+=(["']).*?\1/gi, "")
        .replace(/\son[a-z]+=[^\s>]+/gi, "")
        .replace(/javascript:/gi, "");
}

export default function Markdown({ content }: { content: string }) {
    const html = useMemo(() => {
        const raw = marked.parse(content || "");
        return sanitizeHtml(raw as string);
    }, [content]);

    // Safety: ensure any dynamically added code blocks get highlighted (rare but harmless)
    useEffect(() => {
        document.querySelectorAll("pre code").forEach((el) => {
            hljs.highlightElement(el as HTMLElement);
        });
    }, [html]);

    return (
        <article
            className="prose-like max-w-none"
            dangerouslySetInnerHTML={{ __html: html as string }}
        />
    );
}
