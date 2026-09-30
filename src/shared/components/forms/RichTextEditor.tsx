import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { Hint } from "@shared/components/ui/Tooltip";
import { cn } from "@shared/lib/cn";
import { isRichTextEmpty, sanitizeRichText, tidyEditorHtml, toEditorHtml } from "@shared/lib/richText";

interface RichTextEditorProps {
  /** Stored value: HTML from this editor, or legacy plain text (converted on load). */
  value: string | null | undefined;
  /** Receives sanitised HTML, or "" when the editor holds no content. */
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Accessible name for the editing surface — the field's visible label. */
  ariaLabel?: string;
  /** Height of the writing area before it starts growing. */
  minHeight?: "sm" | "md" | "lg";
  className?: string;
}

const MIN_HEIGHT = { sm: "min-h-[96px]", md: "min-h-[150px]", lg: "min-h-[220px]" };

/**
 * A Word-style editor for the long-form course texts: headings, bold / italic /
 * underline / strike / highlight, lists, quotes, alignment, links, a rule and
 * undo/redo, with the usual shortcuts (Ctrl/⌘+B, I, U, Z …).
 *
 * It stores HTML restricted to the allowlist in `@shared/lib/richText`; the
 * toolbar offers nothing that the API or the website would strip, so what the
 * author sees here is what participants see. Pasting from Word or a web page
 * keeps structure and emphasis and drops colours, fonts and images.
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  invalid,
  disabled,
  ariaLabel,
  minHeight = "md",
  className,
}: RichTextEditorProps) {
  // The last HTML this editor emitted. A value coming back from the form equal
  // to it is our own echo; anything else (a form reset, a loaded course) is
  // pushed into the document.
  const emitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Highlight,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    // Toolbar state is read through useEditorState below, so the host form is
    // not re-rendered on every keystroke and selection change.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: cn("rich-text rich-text-editor px-4 py-3 focus:outline-none", MIN_HEIGHT[minHeight]),
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
      // Pasted HTML goes through the same allowlist before ProseMirror parses it,
      // so a Word document's inline colours and fonts never enter the document.
      transformPastedHTML: (html) => sanitizeRichText(html),
    },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty || isRichTextEmpty(e.getHTML()) ? "" : tidyEditorHtml(sanitizeRichText(e.getHTML()));
      emitted.current = html;
      onChangeRef.current(html);
    },
    onBlur: () => onBlurRef.current?.(),
  });

  // Push outside changes (form reset, a course finishing loading) into the editor.
  useEffect(() => {
    if (!editor) return;
    const next = value ?? "";
    if (next === emitted.current) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    const incoming = toEditorHtml(next);
    if (incoming === current) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
    emitted.current = next;
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border bg-surface transition-[border-color,box-shadow] duration-200",
        "focus-within:ring-[3px]",
        invalid
          ? "border-danger focus-within:border-danger focus-within:ring-danger/20"
          : "border-control-line hover:border-ink-3 focus-within:border-focus focus-within:ring-focus/25",
        disabled && "cursor-not-allowed bg-paper-2 opacity-70",
        className,
      )}
    >
      {editor && <Toolbar editor={editor} disabled={disabled} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ─────────────────────────────── toolbar ─────────────────────────────── */

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive("paragraph") && !e.isActive("heading"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const left = !s.center && !s.right && !s.justify;
  const [linkOpen, setLinkOpen] = useState(false);

  const chain = () => editor.chain().focus();

  return (
    <div className="border-b border-line bg-paper/60">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <Tool label="Undo (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={disabled || !s.canUndo}>
          <Undo2 />
        </Tool>
        <Tool label="Redo (Ctrl+Shift+Z)" onClick={() => chain().redo().run()} disabled={disabled || !s.canRedo}>
          <Redo2 />
        </Tool>
        <Divider />
        <Tool label="Normal text" active={s.paragraph} onClick={() => chain().setParagraph().run()} disabled={disabled}>
          <Pilcrow />
        </Tool>
        <Tool label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} disabled={disabled}>
          <Heading2 />
        </Tool>
        <Tool label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} disabled={disabled}>
          <Heading3 />
        </Tool>
        <Divider />
        <Tool label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()} disabled={disabled}>
          <Bold />
        </Tool>
        <Tool label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()} disabled={disabled}>
          <Italic />
        </Tool>
        <Tool label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()} disabled={disabled}>
          <Underline />
        </Tool>
        <Tool label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()} disabled={disabled}>
          <Strikethrough />
        </Tool>
        <Tool label="Highlight" active={s.highlight} onClick={() => chain().toggleHighlight().run()} disabled={disabled}>
          <Highlighter />
        </Tool>
        <Divider />
        <Tool label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()} disabled={disabled}>
          <List />
        </Tool>
        <Tool label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} disabled={disabled}>
          <ListOrdered />
        </Tool>
        <Tool label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()} disabled={disabled}>
          <Quote />
        </Tool>
        <Divider />
        <Tool label="Align left" active={left} onClick={() => chain().setTextAlign("left").run()} disabled={disabled}>
          <AlignLeft />
        </Tool>
        <Tool label="Align centre" active={s.center} onClick={() => chain().setTextAlign("center").run()} disabled={disabled}>
          <AlignCenter />
        </Tool>
        <Tool label="Align right" active={s.right} onClick={() => chain().setTextAlign("right").run()} disabled={disabled}>
          <AlignRight />
        </Tool>
        <Tool label="Justify" active={s.justify} onClick={() => chain().setTextAlign("justify").run()} disabled={disabled}>
          <AlignJustify />
        </Tool>
        <Divider />
        <Tool label="Link" active={s.link || linkOpen} onClick={() => setLinkOpen((o) => !o)} disabled={disabled}>
          <Link2 />
        </Tool>
        {s.link && (
          <Tool label="Remove link" onClick={() => chain().extendMarkRange("link").unsetLink().run()} disabled={disabled}>
            <Link2Off />
          </Tool>
        )}
        <Tool label="Horizontal line" onClick={() => chain().setHorizontalRule().run()} disabled={disabled}>
          <Minus />
        </Tool>
        <Tool label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()} disabled={disabled}>
          <RemoveFormatting />
        </Tool>
      </div>
      {linkOpen && !disabled && <LinkBar editor={editor} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}

/**
 * Inline "insert link" row under the toolbar. A row rather than a popover:
 * it cannot open off-screen on a phone and needs no focus trap.
 */
function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const inputId = useId();
  const [href, setHref] = useState<string>(() => (editor.getAttributes("link").href as string | undefined) ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const apply = () => {
    let url = href.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(url)) url = `mailto:${url}`;
    else if (!/^(https?:|mailto:)/i.test(url)) url = `https://${url}`;
    try {
      // Reject anything the browser cannot parse as an absolute URL.
      new URL(url);
    } catch {
      setError("Enter a web address such as https://aztu.edu.az");
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      // No text selected: insert the address itself as the link text.
      editor.chain().focus().insertContent({ type: "text", text: href.trim(), marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
      <label htmlFor={inputId} className="text-[12.5px] font-semibold text-ink-2">
        Link address
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="url"
        inputMode="url"
        value={href}
        placeholder="https://"
        onChange={(e) => {
          setHref(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          // Enter must apply the link, not submit the course form around it.
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
        aria-invalid={!!error}
        className={cn(
          "h-9 min-w-0 flex-1 rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-[3px]",
          error ? "border-danger focus:ring-danger/20" : "border-control-line focus:border-focus focus:ring-focus/25",
        )}
      />
      <button
        type="button"
        onClick={apply}
        className="h-9 rounded-full bg-navy px-4 text-[13px] font-semibold text-on-navy hover:bg-navy-hover"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          editor.commands.focus();
        }}
        className="h-9 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-ink/6"
      >
        Cancel
      </button>
      {error && (
        <p role="alert" className="basis-full text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active === undefined ? undefined : active}
        disabled={disabled}
        // Keep the editor's selection: a mousedown on the button would move
        // focus out of the document and collapse what the author selected.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg text-ink-2 transition-colors",
          "hover:bg-ink/6 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/35",
          "[&_svg]:size-4",
          active && "bg-navy-tint text-navy hover:bg-navy-tint hover:text-navy",
        )}
      >
        {children}
      </button>
    </Hint>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line-2" />;
}
