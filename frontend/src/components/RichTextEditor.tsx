import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, Italic, List, ListOrdered, 
  Heading1, Heading2, Quote, Undo, Redo 
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  // Helper to apply classes based on active state
  const getButtonClass = (isActive) => 
    `p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${
      isActive ? 'bg-[var(--accent)] text-(--on-ink)' : 'text-[var(--text-muted)]'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b" style={{ borderColor: 'var(--border)' }}>
      
      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={getButtonClass(editor.isActive('heading', { level: 2 }))}
        aria-pressed={editor.isActive('heading', { level: 2 })}
        title="Heading"
      >
        <Heading1 size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={getButtonClass(editor.isActive('heading', { level: 3 }))}
        aria-pressed={editor.isActive('heading', { level: 3 })}
        title="Subheading"
      >
        <Heading2 size={18} />
      </button>

      <div className="w-px h-6 bg-(--border) mx-1"></div>

      {/* Basic Formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={getButtonClass(editor.isActive('bold'))}
        aria-pressed={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={getButtonClass(editor.isActive('italic'))}
        aria-pressed={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={18} />
      </button>

      <div className="w-px h-6 bg-(--border) mx-1"></div>

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={getButtonClass(editor.isActive('bulletList'))}
        aria-pressed={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={getButtonClass(editor.isActive('orderedList'))}
        aria-pressed={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered size={18} />
      </button>

      <div className="w-px h-6 bg-(--border) mx-1"></div>

      {/* Actions */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={getButtonClass(editor.isActive('blockquote'))}
        aria-pressed={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded-lg text-(--text-muted) hover:bg-(--bg-hover) disabled:opacity-30"
        title="Undo"
      >
        <Undo size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded-lg text-(--text-muted) hover:bg-(--bg-hover) disabled:opacity-30"
        title="Redo"
      >
        <Redo size={18} />
      </button>
    </div>
  );
};

/** `labelledBy` (id of a visible label) or `label` names the editing area for assistive tech. */
export default function RichTextEditor({ value, onChange, labelledBy, label }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': label || 'Description' }),
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[150px] p-4 text-[var(--text)]',
      },
    },
  });

  return (
    <div className="rounded-lg border overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-(--accent)" 
         style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      
      {/* Custom Styles for Tiptap Content inside the editor */}
      <style>{`
        .ProseMirror p { margin-bottom: 0.5em; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: var(--text); }
        .ProseMirror h3 { font-size: 1.25em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: var(--text); }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 0.5em; }
        .ProseMirror blockquote { border-left: 3px solid var(--accent); padding-left: 1em; margin-left: 0; font-style: italic; color: var(--text-muted); }
      `}</style>
    </div>
  );
}