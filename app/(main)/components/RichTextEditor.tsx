"use client";

import { useEffect, useRef } from "react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Bold, Italic, Link2, List, ListOrdered, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeLinkHref } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  id: string;
  name: string;
  placeholder: string;
  maxLength: number;
  resetToken?: string;
};

type ToolbarButtonProps = {
  active?: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  active = false,
  disabled,
  label,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(active ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800" : "")}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  id,
  name,
  placeholder,
  maxLength,
  resetToken,
}: RichTextEditorProps) {
  const lastResetTokenRef = useRef<string | undefined>(undefined);
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          defaultProtocol: "https",
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "ProseMirror min-h-32 rounded-b-md border-x border-b border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none",
        },
      },
    },
    [],
  );

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      html: currentEditor?.getHTML() ?? "",
      textLength: currentEditor?.getText().trim().length ?? 0,
      isBoldActive: currentEditor?.isActive("bold") ?? false,
      isItalicActive: currentEditor?.isActive("italic") ?? false,
      isBulletListActive: currentEditor?.isActive("bulletList") ?? false,
      isOrderedListActive: currentEditor?.isActive("orderedList") ?? false,
      isLinkActive: currentEditor?.isActive("link") ?? false,
      isReady: Boolean(currentEditor && !currentEditor.isDestroyed),
    }),
  });

  const html = editorState?.html ?? "";
  const textLength = editorState?.textLength ?? 0;
  const isOverLimit = textLength > maxLength;

  useEffect(() => {
    if (!editor || editor.isDestroyed || !resetToken || lastResetTokenRef.current === resetToken) {
      return;
    }

    lastResetTokenRef.current = resetToken;
    editor.chain().clearContent().run();
  }, [editor, resetToken]);

  return (
    <div className="space-y-2">
      <div className="tiptap-editor rounded-md border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
          <ToolbarButton
            active={editorState?.isBoldActive}
            disabled={!editorState?.isReady}
            label="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editorState?.isItalicActive}
            disabled={!editorState?.isReady}
            label="Italic"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editorState?.isBulletListActive}
            disabled={!editorState?.isReady}
            label="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editorState?.isOrderedListActive}
            disabled={!editorState?.isReady}
            label="Numbered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editorState?.isLinkActive}
            disabled={!editorState?.isReady}
            label="Add link"
            onClick={() => {
              const previousUrl = editor?.getAttributes("link").href ?? "";
              const url = window.prompt("Enter a URL", previousUrl);

              if (!editor || url === null) {
                return;
              }

              if (url.trim().length === 0) {
                editor.chain().focus().unsetLink().run();
                return;
              }

              editor.chain().focus().setLink({ href: normalizeLinkHref(url) }).run();
            }}
          >
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editorState?.isLinkActive}
            disabled={!editorState?.isLinkActive}
            label="Remove link"
            onClick={() => editor?.chain().focus().unsetLink().run()}
          >
            <Unlink className="size-4" />
          </ToolbarButton>
        </div>

        <EditorContent editor={editor} id={id} aria-describedby={`${id}-hint ${id}-count`} />
      </div>

      {!textLength ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {placeholder}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-xs">
        <p className="text-slate-500">Supports bold, italic, lists, and links.</p>
        <p
          id={`${id}-count`}
          className={cn(isOverLimit ? "text-red-600" : "text-slate-500")}
        >
          {textLength}/{maxLength} characters
        </p>
      </div>

      <input type="hidden" name={name} value={html} />
    </div>
  );
}
