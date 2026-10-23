import sanitizeHtml from 'sanitize-html';

const options: sanitizeHtml.IOptions = {
  allowedTags: ['p','br','h1','strong','b','em','i','u','s','h2','h3','h4','blockquote','ul','ol','li','a','pre','code','hr','table','thead','tbody','tfoot','tr','th','td'],
  allowedAttributes: { a: ['href','name','target','rel'], th: ['colspan','rowspan'], td: ['colspan','rowspan'] },
  allowedSchemes: ['http','https','mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }, true) },
  disallowedTagsMode: 'discard'
};

export function safeArticleHtml(value: string | null | undefined): string {
  const raw = value || '';
  // Support older records saved as plain text: escape them and preserve line breaks.
  if (!/<\/?(?:p|br|h1|strong|b|em|i|u|h[2-4]|blockquote|ul|ol|li|a|pre|code|hr|table|thead|tbody|tfoot|tr|th|td)\b/i.test(raw)) {
    return raw.split(/\r?\n/).map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
  }
  return sanitizeHtml(raw, options);
}
function escapeHtml(value: string) { return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
