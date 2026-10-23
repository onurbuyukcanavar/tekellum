'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { initialContent: string; onChange: (html: string) => void };
type Command = 'bold'|'italic'|'underline'|'insertUnorderedList'|'insertOrderedList'|'undo'|'redo';
const cleanHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,button,input,meta,link').forEach(n=>n.remove());
  doc.body.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(attr=>{
      if(attr.name.toLowerCase().startsWith('on') || (attr.name==='href' && /^\s*javascript:/i.test(attr.value))) el.removeAttribute(attr.name);
      if(attr.name==='style') el.removeAttribute('style');
    });
    if(!['P','BR','H1','STRONG','B','EM','I','U','S','H2','H3','H4','BLOCKQUOTE','UL','OL','LI','A','PRE','CODE','HR','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD'].includes(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
    }
  });
  doc.body.querySelectorAll('a').forEach(a=>{const href=a.getAttribute('href')||'';if(!/^https?:\/\//i.test(href)&&!href.startsWith('mailto:'))a.removeAttribute('href');a.setAttribute('rel','noopener noreferrer');});
  return doc.body.innerHTML;
};
export default function RichTextEditor({initialContent,onChange}:Props){
 const editor=useRef<HTMLDivElement>(null);const fileInput=useRef<HTMLInputElement>(null);const [importing,setImporting]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(editor.current)editor.current.innerHTML=cleanHtml(initialContent||'');},[]);
 function run(command:Command){editor.current?.focus();document.execCommand(command,false);emit();}
 function emit(){if(editor.current)onChange(cleanHtml(editor.current.innerHTML));}
 function insertBlock(tag:'h2'|'h3'|'p'|'blockquote'){editor.current?.focus();document.execCommand('formatBlock',false,tag);emit();}
 async function importDocx(file?:File){if(!file)return;setError('');setImporting(true);try{if(!file.name.toLowerCase().endsWith('.docx'))throw new Error('Lütfen .docx uzantılı bir Word dosyası seçin. Eski .doc biçimi desteklenmiyor.');if(file.size>10*1024*1024)throw new Error('Word dosyası en fazla 10 MB olabilir.');const mammoth=await import('mammoth');const arrayBuffer=await file.arrayBuffer();const result=await mammoth.convertToHtml({arrayBuffer});if(!result.value.trim())throw new Error('Word dosyasında aktarılabilir metin bulunamadı.');if(editor.current){editor.current.innerHTML=cleanHtml(result.value);emit()}if(result.messages.length)setError('Belge aktarıldı; Word dosyasındaki bazı özel düzenler birebir korunmamış olabilir. Lütfen kontrol edin.');}catch(e){setError(e instanceof Error?e.message:'Word dosyası okunamadı. Dosyanın bozuk olmadığını kontrol edin.')}finally{setImporting(false);if(fileInput.current)fileInput.current.value='';}}
 return <div className="rich-editor-wrap">
  <div className="editor-toolbar" role="toolbar" aria-label="Metin biçimlendirme">
   <button type="button" className="editor-tool" title="Kalın (Ctrl+B)" aria-label="Kalın" onMouseDown={e=>e.preventDefault()} onClick={()=>run('bold')}><strong>B</strong></button>
   <button type="button" className="editor-tool" title="İtalik (Ctrl+I)" aria-label="İtalik" onMouseDown={e=>e.preventDefault()} onClick={()=>run('italic')}><em>I</em></button>
   <button type="button" className="editor-tool" title="Altı çizili (Ctrl+U)" aria-label="Altı çizili" onMouseDown={e=>e.preventDefault()} onClick={()=>run('underline')}><u>U</u></button>
   <span className="toolbar-separator" />
   <button type="button" className="editor-tool" onMouseDown={e=>e.preventDefault()} onClick={()=>insertBlock('p')}>Normal</button>
   <button type="button" className="editor-tool" onMouseDown={e=>e.preventDefault()} onClick={()=>insertBlock('h2')}>Başlık</button>
   <button type="button" className="editor-tool" onMouseDown={e=>e.preventDefault()} onClick={()=>insertBlock('h3')}>Alt başlık</button>
   <span className="toolbar-separator" />
   <button type="button" className="editor-tool" title="Madde işaretli liste" onMouseDown={e=>e.preventDefault()} onClick={()=>run('insertUnorderedList')}>• Liste</button>
   <button type="button" className="editor-tool" title="Numaralı liste" onMouseDown={e=>e.preventDefault()} onClick={()=>run('insertOrderedList')}>1. Liste</button>
   <button type="button" className="editor-tool" title="Alıntı" onMouseDown={e=>e.preventDefault()} onClick={()=>insertBlock('blockquote')}>❝ Alıntı</button>
   <span className="toolbar-spacer" />
   <button type="button" className="editor-tool" title="Geri al" onMouseDown={e=>e.preventDefault()} onClick={()=>run('undo')}>↶</button>
   <button type="button" className="editor-tool" title="Yinele" onMouseDown={e=>e.preventDefault()} onClick={()=>run('redo')}>↷</button>
   <button type="button" className="editor-tool import-tool" disabled={importing} onClick={()=>fileInput.current?.click()}>{importing?'Word aktarılıyor…':'Word dosyası ekle (.docx)'}</button>
   <input ref={fileInput} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={e=>void importDocx(e.target.files?.[0])}/>
  </div>
  <div ref={editor} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Makale metni" aria-multiline="true" data-placeholder="Makalenizi buraya yazın. Metni seçerek biçimlendirin; Word dosyasını da içeri aktarabilirsiniz." onInput={emit} onBlur={emit} onPaste={e=>{e.preventDefault();const html=e.clipboardData.getData('text/html');const text=e.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,cleanHtml(html||text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')));emit();}} />
  <div className="editor-footer"><span>Biçimlendirme otomatik kaydetme değildir; makaleyi aşağıdaki düğmeyle kaydet veya yayımla.</span><span>Kalın · İtalik · Altı çizili · Listeler</span></div>
  {error&&<p className="status" role="status">{error}</p>}
 </div>;
}
