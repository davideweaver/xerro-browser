import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";

import type { Todo, UpdateTodoInput } from "@/types/todos";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { formatScheduledDate } from "@/components/todos/TodoRow";
import {
  CalendarDays, Check, Loader2, FolderOpen, Bot,
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, ListChecks, Code2,
  Undo2, Redo2, ClipboardPaste,
  Edit3, MessageSquare, ChevronDown,
} from "lucide-react";

const CustomTaskItem = TaskItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, { "data-type": "taskItem" }),
      ["label", { contenteditable: "false" },
        ["input", { type: "checkbox", checked: node.attrs.checked ? "" : null }],
        ["span"],
      ],
      ["div", 0],
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement("li");
      const checkboxWrapper = document.createElement("label");
      const checkboxStyler = document.createElement("span");
      const checkbox = document.createElement("input");
      const content = document.createElement("div");

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });
      listItem.dataset.type = this.name;

      // Use setProperty with 'important' priority to override prose styles
      listItem.style.setProperty("display", "flex", "important");
      listItem.style.setProperty("flex-direction", "row", "important");
      listItem.style.setProperty("align-items", "flex-start", "important");
      listItem.style.setProperty("gap", "0.5rem", "important");
      listItem.style.setProperty("list-style", "none", "important");
      listItem.style.setProperty("padding", "0", "important");
      listItem.style.setProperty("margin", "0.25rem 0", "important");

      checkboxWrapper.contentEditable = "false";
      checkboxWrapper.style.setProperty("flex", "0 0 auto", "important");
      checkboxWrapper.style.setProperty("display", "flex", "important");
      checkboxWrapper.style.setProperty("align-items", "center", "important");
      checkboxWrapper.style.setProperty("padding-top", "0.15rem", "important");
      checkboxWrapper.style.setProperty("user-select", "none", "important");
      checkboxWrapper.style.setProperty("cursor", "pointer", "important");

      content.style.setProperty("flex", "1 1 auto", "important");
      content.style.setProperty("min-width", "0", "important");

      checkbox.type = "checkbox";
      checkbox.checked = node.attrs.checked;
      checkbox.style.setProperty("width", "1.1rem", "important");
      checkbox.style.setProperty("height", "1.1rem", "important");
      checkbox.style.setProperty("cursor", "pointer", "important");

      checkbox.addEventListener("mousedown", (e) => e.preventDefault());
      checkbox.addEventListener("change", (e) => {
        if (!editor.isEditable) return;
        const { checked } = e.target as HTMLInputElement;
        if (typeof getPos === "function") {
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const pos = getPos();
              if (pos === undefined) return false;
              const currentNode = tr.doc.nodeAt(pos);
              tr.setNodeMarkup(pos, undefined, { ...currentNode?.attrs, checked });
              return true;
            })
            .run();
        }
      });

      if (!editor.isEditable) {
        checkbox.setAttribute("disabled", "disabled");
      }

      listItem.append(checkboxWrapper, content);
      checkboxWrapper.append(checkbox, checkboxStyler);

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) return false;
          if (updatedNode.attrs.checked) {
            checkbox.setAttribute("checked", "checked");
          } else {
            checkbox.removeAttribute("checked");
          }
          checkbox.checked = updatedNode.attrs.checked;
          return true;
        },
      };
    };
  },
});

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${
        active
          ? "bg-white/20 text-white"
          : "text-zinc-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function HeadingSelect({ editor }: { editor: Editor }) {
  const getLevel = () =>
    ([1, 2, 3, 4] as const).find((l) => editor.isActive("heading", { level: l }))?.toString() ?? "0";

  const [value, setValue] = useState(getLevel);

  useEffect(() => {
    const update = () => setValue(getLevel());
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <select
      value={value}
      onChange={(e) => {
        const level = parseInt(e.target.value);
        if (level === 0) {
          editor.chain().focus().setParagraph().run();
        } else {
          editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 }).run();
        }
      }}
      className="h-8 px-1.5 text-xs bg-zinc-700 text-zinc-300 border-0 rounded focus:outline-none cursor-pointer"
    >
      <option value="0" className="bg-zinc-800">Normal</option>
      <option value="1" className="bg-zinc-800">H1</option>
      <option value="2" className="bg-zinc-800">H2</option>
      <option value="3" className="bg-zinc-800">H3</option>
      <option value="4" className="bg-zinc-800">H4</option>
    </select>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-zinc-800 border-b border-zinc-700 flex-wrap shrink-0">
      <HeadingSelect editor={editor} />
      <div className="w-px h-4 bg-zinc-600 mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-4 bg-zinc-600 mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-4 bg-zinc-600 mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task list">
        <ListChecks className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-4 bg-zinc-600 mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
        <Code2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-4 bg-zinc-600 mx-1" />
      <ToolbarBtn
        onClick={async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            editor.commands.focus();
            const clipboardData = new DataTransfer();
            clipboardData.setData("text/plain", text);
            editor.view.dom.dispatchEvent(
              new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true })
            );
          } catch {
            // clipboard permission denied
          }
        }}
        title="Paste markdown from clipboard"
      >
        <ClipboardPaste className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved";

interface TodoEditSheetProps {
  todo: Todo | null;
  onClose: () => void;
  onSave: (id: string, input: UpdateTodoInput) => Promise<void>;
  onOpenEditDialog?: () => void;
  onSendToChat?: (todo: Todo) => void;
  onSendToAgent?: (todo: Todo) => void;
}

export function TodoEditSheet({ todo, onClose, onSave, onOpenEditDialog, onSendToChat, onSendToAgent }: TodoEditSheetProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedMarkdownRef = useRef<string>("");
  const currentTodoIdRef = useRef<string | null>(null);

  const scheduleSave = useCallback(
    (id: string, markdown: string) => {
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
      setSaveState("saving");
      pendingSaveRef.current = setTimeout(async () => {
        try {
          await onSave(id, { body: markdown || null });
          lastSavedMarkdownRef.current = markdown;
          setSaveState("saved");
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
        } catch {
          setSaveState("idle");
        }
      }, 800);
    },
    [onSave]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      CustomTaskItem.configure({ nested: true }),
      Markdown.configure({ transformPastedText: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap prose prose-sm prose-invert max-w-none focus:outline-none px-6 py-4 min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      const id = currentTodoIdRef.current;
      if (!id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor.storage as any).markdown.getMarkdown() as string;
      if (markdown !== lastSavedMarkdownRef.current) {
        scheduleSave(id, markdown);
      }
    },
  });

  useEffect(() => {
    if (!editor || !todo) return;
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    currentTodoIdRef.current = todo.id;
    const initialMarkdown = todo.body ?? "";
    lastSavedMarkdownRef.current = initialMarkdown;
    setSaveState("idle");
    editor.commands.setContent(initialMarkdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.id, editor]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <Sheet open={!!todo} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0 bg-zinc-900 border-zinc-700">
        {todo && (
          <>
            <div className="px-6">
              <SidePanelHeader
                titleClassName="text-lg text-zinc-100"
                title={todo.title}
                description={
                  <div className="flex items-center gap-2">
                    {/* Save status */}
                    {saveState === "saving" && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving…
                      </span>
                    )}
                    {saveState === "saved" && (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Saved
                      </span>
                    )}
                    {saveState === "idle" && (
                      <>
                        {/* Date */}
                        {todo.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatScheduledDate(todo.scheduledDate)}
                          </span>
                        )}
                        {/* Project name */}
                        {todo.projectName && (
                          <>
                            {todo.scheduledDate && <span className="text-zinc-600">•</span>}
                            <span className="flex items-center gap-1">
                              {todo.agentId
                                ? <Bot className="h-3.5 w-3.5" />
                                : <FolderOpen className="h-3.5 w-3.5" />
                              }
                              {todo.projectName}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                }
              />
            </div>
            {/* Action buttons strip */}
            <div className="px-6 pt-2 pb-1 flex items-center justify-end gap-2">
              {onOpenEditDialog && (
                <ContainerToolButton onClick={onOpenEditDialog}>
                  <Edit3 className="mr-1.5 h-4 w-4" />
                  Edit
                </ContainerToolButton>
              )}
              {(onSendToChat || (onSendToAgent && todo.agentId)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ContainerToolButton>
                      More
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </ContainerToolButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onSendToChat && (
                      <DropdownMenuItem onClick={() => { onSendToChat(todo); onClose(); }}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat about this…
                      </DropdownMenuItem>
                    )}
                    {onSendToAgent && todo.agentId && (
                      <DropdownMenuItem onClick={() => { onSendToAgent(todo); onClose(); }}>
                        <Bot className="mr-2 h-4 w-4" />
                        Send to Agent
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
              {editor && <EditorToolbar editor={editor} />}
              <div className="flex-1 overflow-auto">
                <EditorContent editor={editor} className="h-full" />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
